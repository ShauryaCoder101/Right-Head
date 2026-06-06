const { prisma } = require('../config/database');
const { scoreQueue } = require('../config/queue');
const { rerankCandidates } = require('../services/scoring/reranker');
const { startRescreening, findHiddenGems } = require('../services/scoring/rescreen.service');
const { logAudit } = require('../services/audit/audit.service');
const { scoreCandidate } = require('../services/scoring/scoring.engine');

/**
 * POST /api/v1/scoring/run — Trigger scoring for a JD
 */
async function run(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    const { jdId, candidateIds, instructions } = req.body;

    if (!jdId) return res.status(400).json({ error: 'jdId is required' });

    const jd = await prisma.jobDescription.findFirst({
      where: { id: jdId, tenantId },
    });
    if (!jd) return res.status(404).json({ error: 'Job description not found' });
    if (!jd.parsedRequirements) return res.status(400).json({ error: 'JD has not been parsed' });

    // Get candidates to score (must have parsedData)
    const where = { tenantId, deletedAt: null, parsedData: { not: null } };
    if (candidateIds?.length > 0) where.id = { in: candidateIds };

    const candidates = await prisma.candidate.findMany({
      where,
      select: { id: true, parsedData: true },
    });

    if (candidates.length === 0) {
      return res.status(400).json({ error: 'No parsed candidates found to score. Upload and wait for parsing to complete first.' });
    }

    const weightProfile = jd.weightProfile || { skills: 40, experience: 30, education: 15, profile: 15 };

    // Create batch job
    const batchJob = await prisma.batchJob.create({
      data: {
        tenantId,
        jdId,
        status: 'RUNNING',
        jobType: 'SCORE',
        totalCount: candidates.length,
        startedAt: new Date(),
      },
    });

    await logAudit({
      tenantId, actorId, action: 'SCORING_STARTED',
      entityType: 'BatchJob', entityId: batchJob.id,
      metadata: { jdId, candidateCount: candidates.length },
    });

    // Respond immediately
    res.status(202).json({
      batchJobId: batchJob.id,
      candidateCount: candidates.length,
      message: `Scoring started for ${candidates.length} candidates`,
    });

    // Score inline (no Redis required) — runs after response is sent
    let doneCount = 0;
    let failedCount = 0;
    for (const candidate of candidates) {
      try {
        console.log(`🎯 Scoring candidate ${candidate.id} (${doneCount + 1}/${candidates.length})`);
        // Merge instructions: request-level instructions take priority over saved ones
        const extraInstructions = instructions || jd.screeningInstructions || null;
        const result = await scoreCandidate(candidate.parsedData, jd.parsedRequirements, weightProfile, extraInstructions);

        await prisma.scoreRecord.create({
          data: {
            candidateId: candidate.id,
            jdId,
            totalScore: Math.round(result.totalScore),
            dimensionScores: result.dimensionScores,
            explanation: typeof result.matchNotes === 'object' ? JSON.stringify(result.matchNotes) : result.matchNotes,
            flags: result.flags || [],
          },
        });
        doneCount++;
        console.log(`✅ Scored: ${candidate.id} = ${result.totalScore} (${doneCount}/${candidates.length})`);
      } catch (err) {
        failedCount++;
        console.error(`❌ Failed to score ${candidate.id}: ${err.message}`);
      }

      await prisma.batchJob.update({
        where: { id: batchJob.id },
        data: { doneCount, failedCount },
      });
    }

    await prisma.batchJob.update({
      where: { id: batchJob.id },
      data: {
        status: failedCount === candidates.length ? 'FAILED' : 'DONE',
        doneCount,
        failedCount,
        completedAt: new Date(),
      },
    });
    console.log(`🏁 Scoring batch ${batchJob.id} complete: ${doneCount} scored, ${failedCount} failed`);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/scoring/results/:jdId — Get ranked shortlist
 */
async function getResults(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { jdId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'totalScore';
    const sortOrder = req.query.sortOrder || 'desc';
    const minScore = parseInt(req.query.minScore) || 0;

    const jd = await prisma.jobDescription.findFirst({
      where: { id: jdId, tenantId },
      select: { id: true, title: true, weightProfile: true, parsedRequirements: true },
    });
    if (!jd) return res.status(404).json({ error: 'Job description not found' });

    // Get latest score per candidate
    const orderBy = {};
    if (sortBy === 'totalScore') orderBy.totalScore = sortOrder;
    else orderBy.scoredAt = sortOrder;

    const where = {
      jdId,
      totalScore: { gte: minScore },
      candidate: { tenantId, deletedAt: null },
    };

    const [scores, total] = await Promise.all([
      prisma.scoreRecord.findMany({
        where,
        include: {
          candidate: {
            select: { id: true, name: true, email: true, phone: true, parsedData: true, tags: true },
          },
        },
        // Order by scoredAt DESC so distinct picks the LATEST score per candidate
        orderBy: { scoredAt: 'desc' },
        distinct: ['candidateId'],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.scoreRecord.groupBy({
        by: ['candidateId'],
        where,
        _count: true,
      }).then(r => r.length),
    ]);

    // Sort by totalScore for ranking (after getting latest per candidate)
    scores.sort((a, b) => b.totalScore - a.totalScore);

    // Check batch job status
    const batchJob = await prisma.batchJob.findFirst({
      where: { jdId, tenantId, jobType: { in: ['SCORE', 'RESCREEN'] } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      jd,
      results: scores.map((s, i) => ({
        rank: (page - 1) * limit + i + 1,
        candidate: s.candidate,
        totalScore: s.totalScore,
        dimensionScores: s.dimensionScores,
        explanation: s.explanation,
        flags: s.flags,
        scoredAt: s.scoredAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      batchStatus: batchJob?.status || null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/scoring/rescreen — Re-screen historical pool
 */
async function rescreen(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    const { jdId, filters } = req.body;

    if (!jdId) return res.status(400).json({ error: 'jdId is required' });

    const batchJob = await startRescreening(jdId, tenantId, actorId, filters || {});

    res.status(202).json({
      batchJobId: batchJob.id,
      totalCount: batchJob.totalCount,
      message: `Re-screening started for ${batchJob.totalCount} candidates`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/scoring/rerank/:jdId — Re-rank with new weights (no LLM call)
 */
async function rerank(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { jdId } = req.params;
    const newWeights = req.body;

    const total = (newWeights.skills || 0) + (newWeights.experience || 0) + (newWeights.education || 0) + (newWeights.profile || 0);
    if (Math.abs(total - 100) > 0.1) {
      return res.status(400).json({ error: 'Weights must sum to 100' });
    }

    // Get all score records for this JD
    const scores = await prisma.scoreRecord.findMany({
      where: { jdId, candidate: { tenantId, deletedAt: null } },
      include: {
        candidate: {
          select: { id: true, name: true, email: true, parsedData: true },
        },
      },
      distinct: ['candidateId'],
      orderBy: { scoredAt: 'desc' },
    });

    const reranked = rerankCandidates(scores, newWeights);

    res.json({
      results: reranked.map((item, i) => ({
        rank: i + 1,
        candidate: item.candidate,
        totalScore: item.totalScore,
        dimensionScores: item.dimensionScores,
        explanation: item.explanation,
      })),
      weights: newWeights,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/scoring/hidden-gems/:jdId — Find Hidden Gems
 */
async function getHiddenGems(req, res, next) {
  try {
    const { tenantId } = req.user;
    const gems = await findHiddenGems(req.params.jdId, tenantId);
    res.json({ hiddenGems: gems });
  } catch (err) {
    next(err);
  }
}

module.exports = { run, getResults, rescreen, rerank, getHiddenGems };
