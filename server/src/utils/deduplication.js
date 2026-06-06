// @ts-check
'use strict';

const { prisma } = require('../config/database');

/**
 * Find a duplicate candidate within a tenant based on email or name+phone combination.
 *
 * Deduplication rules:
 * 1. Exact email match (case-insensitive) — strongest signal
 * 2. Same name + same phone — secondary signal
 *
 * Only considers non-deleted candidates within the same tenant.
 *
 * @param {string} tenantId - Tenant ID for multi-tenant isolation
 * @param {object} candidateData - Parsed candidate data to check
 * @param {string} [candidateData.email] - Candidate email
 * @param {string} [candidateData.name] - Candidate name
 * @param {string} [candidateData.phone] - Candidate phone
 * @returns {Promise<object|null>} Existing candidate record if duplicate found, null otherwise
 */
async function findDuplicate(tenantId, candidateData) {
  const { email, name, phone } = candidateData;

  // Strategy 1: Match by email (most reliable)
  if (email) {
    const emailMatch = await prisma.candidate.findFirst({
      where: {
        tenantId,
        email: { equals: email.toLowerCase().trim(), mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (emailMatch) {
      return emailMatch;
    }
  }

  // Strategy 2: Match by name + phone
  if (name && phone) {
    const normalizedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    const namePhoneMatch = await prisma.candidate.findFirst({
      where: {
        tenantId,
        name: { equals: name.trim(), mode: 'insensitive' },
        phone: { contains: normalizedPhone.slice(-10) }, // last 10 digits
        deletedAt: null,
      },
    });

    if (namePhoneMatch) {
      return namePhoneMatch;
    }
  }

  return null;
}

module.exports = {
  findDuplicate,
};
