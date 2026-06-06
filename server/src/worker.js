require('dotenv').config();
const { Worker } = require('bullmq');
const { connection } = require('./config/queue');
const { prisma } = require('./config/database');
const { config } = require('./config/env');
const { extractText } = require('./utils/fileExtractor');
const { parseResume } = require('./services/parser/resume.parser');
const { scoreCandidate } = require('./services/scoring/scoring.engine');
const { generateExplanation } = require('./services/scoring/explanation.generator');
const { findDuplicate } = require('./utils/deduplication');
const { createNotification } = require('./services/notification/notification.service');

/**
 * Parse Worker — processes resume parsing jobs
 */
const parseWorker = new Worker('parse-resume', async (job) => {
  const { filePath, candidateId, tenantId, mimeType, batchJobId, originalName } = job.data;

  console.log(`[Parse] Processing: ${originalName || candidateId}`);

  try {
    // Extract text
    const text = await extractText(filePath, mimeType);

    if (!text || text.trim().length < 50) {
      throw new Error('Insufficient text extracted — file may be image-based or corrupted');
    }

    // Parse with LLM
    const parsed = await parseResume(text);

    // Check for duplicates
    const duplicate = await findDuplicate(tenantId, parsed);

    if (duplicate && duplicate.id !== candidateId) {
      // Merge: update existing candidate, delete the new one
      await prisma.candidate.update({
        where: { id: duplicate.id },
        data: {
          parsedData: parsed,
          rawResumeUrl: filePath,
          updatedAt: new Date(),
        },
      });
      await prisma.candidate.delete({ where: { id: candidateId } });
      console.log(`[Parse] Merged duplicate: ${candidateId} → ${duplicate.id}`);
    } else {
      // Update candidate with parsed data
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          name: parsed.name || originalName || 'Unknown',
          email: parsed.email || null,
          phone: parsed.phone || null,
          parsedData: parsed,
        },
      });
    }

    // Update batch progress
    if (batchJobId) {
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { doneCount: { increment: 1 } },
      });

      // Check if batch is complete
      const batch = await prisma.batchJob.findUnique({ where: { id: batchJobId } });
      if (batch && batch.doneCount + batch.failedCount >= batch.totalCount) {
        await prisma.batchJob.update({
          where: { id: batchJobId },
          data: { status: 'DONE', completedAt: new Date() },
        });

        // Notify the user who created the batch
        const jd = batch.jdId ? await prisma.jobDescription.findUnique({ where: { id: batch.jdId }, select: { createdById: true, title: true } }) : null;
        if (jd?.createdById) {
          await createNotification({
            userId: jd.createdById,
            type: 'BATCH_COMPLETE',
            title: 'Resume Parsing Complete',
            message: `${batch.doneCount} of ${batch.totalCount} resumes parsed successfully.`,
            link: `/candidates`,
          });
        }
      }
    }

    console.log(`[Parse] Done: ${parsed.name || candidateId}`);
  } catch (err) {
    console.error(`[Parse] Error for ${candidateId}:`, err.message);

    if (batchJobId) {
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { failedCount: { increment: 1 } },
      });
    }

    throw err; // BullMQ will retry
  }
}, { connection, concurrency: parseInt(process.env.BATCH_CONCURRENCY || '5') });

/**
 * Score Worker — processes candidate scoring jobs
 */
const scoreWorker = new Worker('score-candidate', async (job) => {
  const { candidateId, jdId, tenantId, weightProfile, batchJobId, generateExplanation: genExplanation } = job.data;

  console.log(`[Score] Scoring candidate ${candidateId} against JD ${jdId}`);

  try {
    const [candidate, jd] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: candidateId } }),
      prisma.jobDescription.findUnique({ where: { id: jdId } }),
    ]);

    if (!candidate?.parsedData || !jd?.parsedRequirements) {
      console.log(`[Score] Skipping — missing data for ${candidateId}`);
      return;
    }

    // Score
    const result = await scoreCandidate(candidate.parsedData, jd.parsedRequirements, weightProfile);

    // Generate explanation for top candidates
    let explanation = null;
    if (genExplanation) {
      try {
        explanation = await generateExplanation(candidate.parsedData, jd.parsedRequirements, result.dimensionScores);
      } catch (err) {
        console.error(`[Score] Explanation generation failed for ${candidateId}:`, err.message);
      }
    }

    // Save score record
    await prisma.scoreRecord.create({
      data: {
        candidateId,
        jdId,
        totalScore: Math.round(result.totalScore),
        dimensionScores: result.dimensionScores,
        explanation: explanation || result.matchNotes || null,
        flags: result.flags || [],
      },
    });

    // Update batch progress
    if (batchJobId) {
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { doneCount: { increment: 1 } },
      });

      const batch = await prisma.batchJob.findUnique({ where: { id: batchJobId } });
      if (batch && batch.doneCount + batch.failedCount >= batch.totalCount) {
        await prisma.batchJob.update({
          where: { id: batchJobId },
          data: { status: 'DONE', completedAt: new Date() },
        });

        // Notify
        const jdData = await prisma.jobDescription.findUnique({ where: { id: jdId }, select: { createdById: true, title: true } });
        if (jdData?.createdById) {
          await createNotification({
            userId: jdData.createdById,
            type: 'SCORING_DONE',
            title: 'Screening Complete',
            message: `Scoring for "${jdData.title}" is complete. ${batch.doneCount} candidates scored.`,
            link: `/scoring/${jdId}`,
          });
        }
      }
    }

    console.log(`[Score] Done: ${candidateId} → ${Math.round(result.totalScore)}/100`);
  } catch (err) {
    console.error(`[Score] Error for ${candidateId}:`, err.message);

    if (batchJobId) {
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { failedCount: { increment: 1 } },
      });
    }

    throw err;
  }
}, { connection, concurrency: parseInt(process.env.BATCH_CONCURRENCY || '5') });

/**
 * Enrich Worker — Phase 2 stub
 */
const enrichWorker = new Worker('enrich-candidate', async (job) => {
  console.log(`[Enrich] Phase 2 stub — job ${job.id} skipped`);
}, { connection, concurrency: 2 });

// Worker event handlers
[parseWorker, scoreWorker, enrichWorker].forEach((worker) => {
  worker.on('failed', (job, err) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message);
  });
  worker.on('error', (err) => {
    console.error(`[${worker.name}] Worker error:`, err.message);
  });
});

console.log('\n🔧 RecruitIQ Workers Started');
console.log('   Parse worker:   active');
console.log('   Score worker:   active');
console.log('   Enrich worker:  standby (Phase 2)\n');

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all([
    parseWorker.close(),
    scoreWorker.close(),
    enrichWorker.close(),
  ]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
