/**
 * LinkedIn Profile Enrichment Service
 * STATUS: Phase 2 — Not yet implemented
 *
 * Planned OAuth flow:
 * 1. Recruiter initiates enrichment for a candidate
 * 2. System generates an OAuth consent link for the candidate
 * 3. Candidate clicks link, authorizes LinkedIn data access
 * 4. System fetches profile data via LinkedIn API:
 *    - Current role and company
 *    - Endorsements count
 *    - Recommendation count
 *    - Activity recency (last post/interaction date)
 * 5. Data merged with parsed resume via merge.service.js
 * 6. Discrepancies flagged (e.g., tenure mismatch > 6 months)
 *
 * Prerequisites:
 * - LinkedIn API partnership approval
 * - LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET env vars
 * - Candidate consent tracking in database
 */

/**
 * Enrich candidate profile from LinkedIn (Phase 2 stub)
 * @param {string} candidateId
 * @param {string} linkedinUrl
 * @returns {Promise<null>}
 */
async function enrichFromLinkedIn(candidateId, linkedinUrl) {
  console.log(`[LinkedIn Enrichment] Phase 2 stub — skipping enrichment for candidate ${candidateId}`);
  console.log(`[LinkedIn Enrichment] URL: ${linkedinUrl}`);
  return null;
}

/**
 * Generate LinkedIn OAuth consent URL for a candidate (Phase 2 stub)
 * @param {string} candidateId
 * @param {string} callbackUrl
 * @returns {Promise<string|null>}
 */
async function generateConsentUrl(candidateId, callbackUrl) {
  console.log(`[LinkedIn Enrichment] Phase 2 stub — consent URL generation not available`);
  return null;
}

module.exports = { enrichFromLinkedIn, generateConsentUrl };
