/**
 * GitHub Profile Enrichment Service
 * STATUS: Phase 2 — Not yet implemented
 *
 * Planned implementation:
 * 1. Accept GitHub username or profile URL
 * 2. Call GitHub REST API (with PAT for higher rate limits):
 *    - GET /users/{username} — bio, public repos, followers
 *    - GET /users/{username}/repos?sort=stars — top repos, languages
 *    - GET /users/{username}/events — recent activity / contribution streak
 * 3. Aggregate:
 *    - Public repo count
 *    - Top languages (weighted by repo size)
 *    - Contribution streak (last year)
 *    - Total stars on owned repos
 * 4. Cache results for 30 days
 * 5. Merge with candidate profile
 *
 * Rate limits:
 * - Unauthenticated: 60 req/hour
 * - With PAT: 5,000 req/hour
 * - Implement rate-limit-aware queuing
 */

/**
 * Enrich candidate profile from GitHub (Phase 2 stub)
 * @param {string} username - GitHub username
 * @returns {Promise<null>}
 */
async function enrichFromGitHub(username) {
  console.log(`[GitHub Enrichment] Phase 2 stub — skipping enrichment for user ${username}`);
  return null;
}

module.exports = { enrichFromGitHub };
