const { stringify } = require('csv-stringify/sync');
const { prisma } = require('../../config/database');

/**
 * Generate CSV export of scored candidates for a JD
 * @param {string} jdId - Job description ID
 * @param {string} tenantId - Tenant ID
 * @param {object} [options]
 * @param {number} [options.minScore] - Minimum score filter
 * @param {number} [options.limit] - Max candidates to export
 * @returns {Promise<{csv: string, filename: string}>}
 */
async function generateCsvExport(jdId, tenantId, options = {}) {
  const jd = await prisma.jobDescription.findFirst({
    where: { id: jdId, tenantId },
  });
  if (!jd) throw new Error('Job description not found');

  const where = {
    jdId,
    candidate: { tenantId, deletedAt: null },
  };
  if (options.minScore) {
    where.totalScore = { gte: options.minScore };
  }

  const scores = await prisma.scoreRecord.findMany({
    where,
    include: {
      candidate: {
        select: { name: true, email: true, phone: true, parsedData: true },
      },
    },
    orderBy: { totalScore: 'desc' },
    take: options.limit || 1000,
    distinct: ['candidateId'],
  });

  const rows = scores.map((score, index) => {
    const dims = score.dimensionScores || {};
    const parsed = score.candidate.parsedData || {};

    return {
      Rank: index + 1,
      Name: score.candidate.name || 'N/A',
      Email: score.candidate.email || 'N/A',
      Phone: score.candidate.phone || '',
      'Total Score': score.totalScore,
      'Skills Score': dims.skills ?? '',
      'Experience Score': dims.experience ?? '',
      'Education Score': dims.education ?? '',
      'Profile Score': dims.profile ?? '',
      Location: parsed.location || '',
      'Total Experience (Years)': parsed.total_experience_years || '',
      'Key Skills': Array.isArray(parsed.skills) ? parsed.skills.slice(0, 10).join(', ') : '',
      'Scored At': score.scoredAt?.toISOString() || '',
    };
  });

  const csv = stringify(rows, { header: true });
  const safeName = (jd.title || 'shortlist').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `RecruitIQ_${safeName}_${new Date().toISOString().split('T')[0]}.csv`;

  return { csv, filename };
}

module.exports = { generateCsvExport };
