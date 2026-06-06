const { prisma } = require('../../config/database');
const { scoreQueue } = require('../../config/queue');
const { logAudit } = require('../audit/audit.service');

/**
 * Start a re-screening job — score historical candidate pool against a JD
 * @param {string} jdId - Job description ID
 * @param {string} tenantId - Tenant ID
 * @param {string} actorId - User initiating the rescreen
 * @param {object} [filters] - Optional pool filters
 * @param {string} [filters.dateFrom] - Start date
 * @param {string} [filters.dateTo] - End date
 * @param {string} [filters.sourceBatch] - Source batch name
 * @param {string[]} [filters.tags] - Tags to filter by
 * @returns {Promise<object>} Batch job record
 */
async function startRescreening(jdId, tenantId, actorId, filters = {}) {
  // Load JD
  const jd = await prisma.jobDescription.findFirst({
    where: { id: jdId, tenantId },
  });
  if (!jd) throw new Error('Job description not found');
  if (!jd.parsedRequirements) throw new Error('JD has not been parsed yet');

  // Build candidate query filters
  const where = {
    tenantId,
    deletedAt: null,
    parsedData: { not: null },
  };

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }
  if (filters.sourceBatch) {
    where.sourceBatch = filters.sourceBatch;
  }
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags };
  }

  // Count matching candidates
  const totalCount = await prisma.candidate.count({ where });
  if (totalCount === 0) {
    throw new Error('No candidates match the specified filters');
  }

  // Create batch job
  const batchJob = await prisma.batchJob.create({
    data: {
      tenantId,
      jdId,
      poolFilter: filters,
      status: 'QUEUED',
      jobType: 'RESCREEN',
      totalCount,
      doneCount: 0,
      failedCount: 0,
    },
  });

  // Get candidate IDs
  const candidates = await prisma.candidate.findMany({
    where,
    select: { id: true },
  });

  const weightProfile = jd.weightProfile || {
    skills: 40,
    experience: 30,
    education: 15,
    profile: 15,
  };

  // Enqueue scoring jobs
  const jobs = candidates.map((candidate) => ({
    name: `score-${candidate.id}-${jdId}`,
    data: {
      candidateId: candidate.id,
      jdId,
      tenantId,
      weightProfile,
      batchJobId: batchJob.id,
      generateExplanation: false,
    },
    opts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  }));

  // Add jobs in bulk
  await scoreQueue.addBulk(jobs);

  // Update batch status
  await prisma.batchJob.update({
    where: { id: batchJob.id },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  // Audit log
  await logAudit({
    tenantId,
    actorId,
    action: 'RESCREEN_STARTED',
    entityType: 'BatchJob',
    entityId: batchJob.id,
    metadata: { jdId, totalCount, filters },
  });

  return batchJob;
}

/**
 * Find "Hidden Gems" — candidates who scored significantly higher on a new JD
 * compared to their best previous score across all other JDs
 * @param {string} jdId - The new JD to check against
 * @param {string} tenantId - Tenant ID
 * @param {number} [threshold=20] - Minimum score improvement to qualify
 * @returns {Promise<object[]>} Array of hidden gem candidates
 */
async function findHiddenGems(jdId, tenantId, threshold = 20) {
  // Get scores for the new JD
  const newScores = await prisma.scoreRecord.findMany({
    where: { jdId, candidate: { tenantId, deletedAt: null } },
    include: { candidate: { select: { id: true, name: true, email: true } } },
  });

  const hiddenGems = [];

  for (const newScore of newScores) {
    // Get best previous score across all OTHER JDs
    const bestPrevious = await prisma.scoreRecord.findFirst({
      where: {
        candidateId: newScore.candidateId,
        jdId: { not: jdId },
      },
      orderBy: { totalScore: 'desc' },
      select: { totalScore: true, jdId: true },
    });

    if (bestPrevious && newScore.totalScore - bestPrevious.totalScore >= threshold) {
      hiddenGems.push({
        candidate: newScore.candidate,
        newScore: newScore.totalScore,
        bestPreviousScore: bestPrevious.totalScore,
        improvement: newScore.totalScore - bestPrevious.totalScore,
        previousJdId: bestPrevious.jdId,
      });
    } else if (!bestPrevious && newScore.totalScore >= 70) {
      // First time scored and it's high — also noteworthy
      hiddenGems.push({
        candidate: newScore.candidate,
        newScore: newScore.totalScore,
        bestPreviousScore: null,
        improvement: null,
        previousJdId: null,
        isFirstScore: true,
      });
    }
  }

  return hiddenGems.sort((a, b) => (b.improvement || 0) - (a.improvement || 0));
}

/**
 * Get scoring history for a candidate across all JDs
 * @param {string} candidateId - Candidate ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<object[]>} Score history
 */
async function getCandidateScoreHistory(candidateId, tenantId) {
  return prisma.scoreRecord.findMany({
    where: {
      candidateId,
      candidate: { tenantId },
    },
    include: {
      jd: { select: { id: true, title: true } },
    },
    orderBy: { scoredAt: 'desc' },
  });
}

module.exports = {
  startRescreening,
  findHiddenGems,
  getCandidateScoreHistory,
};
