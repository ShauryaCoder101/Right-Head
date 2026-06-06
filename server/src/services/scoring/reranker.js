// @ts-check
'use strict';

/**
 * Re-rank candidates using stored dimension scores and new weight profiles.
 *
 * This is a PURE MATH operation — NO LLM call is made. It recomputes
 * the composite score by applying new weights to existing dimension
 * score vectors, making it instant and free.
 *
 * @param {Array<object>} scoreRecords - Array of score records, each containing:
 *   - id: score record ID
 *   - candidateId: candidate ID
 *   - dimensionScores: { skills, experience, education, profile }
 *   - candidate: optional candidate metadata
 * @param {object} newWeights - New weight profile
 * @param {number} newWeights.skills - Skills weight (0-100)
 * @param {number} newWeights.experience - Experience weight (0-100)
 * @param {number} newWeights.education - Education weight (0-100)
 * @param {number} newWeights.profile - Profile weight (0-100)
 * @returns {Array<object>} Re-ranked score records with new composite scores
 */
function rerankCandidates(scoreRecords, newWeights) {
  if (!Array.isArray(scoreRecords) || scoreRecords.length === 0) {
    return [];
  }

  // Validate weights sum to 100
  const weightSum = newWeights.skills + newWeights.experience + newWeights.education + newWeights.profile;
  if (Math.abs(weightSum - 100) > 0.01) {
    throw new Error(`Weights must sum to 100, got ${weightSum}`);
  }

  // Recompute composite scores
  const reranked = scoreRecords.map((record) => {
    const dims = record.dimensionScores || {};
    const skills = typeof dims.skills === 'number' ? dims.skills : 0;
    const experience = typeof dims.experience === 'number' ? dims.experience : 0;
    const education = typeof dims.education === 'number' ? dims.education : 0;
    const profile = typeof dims.profile === 'number' ? dims.profile : 0;

    const newTotalScore =
      (skills * newWeights.skills +
        experience * newWeights.experience +
        education * newWeights.education +
        profile * newWeights.profile) /
      100;

    return {
      ...record,
      previousTotalScore: record.totalScore,
      totalScore: Math.round(newTotalScore * 100) / 100,
      weightsUsed: { ...newWeights },
    };
  });

  // Sort by new total score descending
  reranked.sort((a, b) => b.totalScore - a.totalScore);

  // Assign new ranks
  reranked.forEach((record, index) => {
    record.rank = index + 1;
  });

  return reranked;
}

module.exports = {
  rerankCandidates,
};
