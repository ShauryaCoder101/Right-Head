/**
 * Enrichment Data Merge Service
 * STATUS: Phase 2 — Not yet implemented
 *
 * Merges enriched profile data (LinkedIn, GitHub) with parsed resume.
 * Detects discrepancies between resume and enriched data:
 * - Tenure mismatch > 6 months → FLAG
 * - Title mismatch → INFO
 * - Skills not on resume → ADD
 */

const { prisma } = require('../../config/database');

/**
 * Merge enriched data with candidate profile (Phase 2 stub)
 * @param {string} candidateId
 * @param {object} enrichedData
 * @returns {Promise<object|null>}
 */
async function mergeEnrichmentData(candidateId, enrichedData) {
  console.log(`[Merge Service] Phase 2 stub — skipping merge for candidate ${candidateId}`);

  // When implemented, this will:
  // 1. Load current candidate parsed data
  // 2. Compare fields (title, tenure, skills)
  // 3. Flag discrepancies with severity levels
  // 4. Store merged data in enrichedData column
  // 5. Trigger re-scoring if significant changes found

  return null;
}

/**
 * Detect discrepancies between resume and enriched data (Phase 2 stub)
 * @param {object} parsedData - Parsed resume data
 * @param {object} enrichedData - Enriched profile data
 * @returns {object[]} Array of discrepancy objects
 */
function detectDiscrepancies(parsedData, enrichedData) {
  // Placeholder — will compare:
  // - Current title
  // - Tenure at current company (flag if >6 month diff)
  // - Skills (add missing ones from enrichment)
  return [];
}

module.exports = { mergeEnrichmentData, detectDiscrepancies };
