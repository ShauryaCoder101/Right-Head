// @ts-check
'use strict';

const { prisma } = require('../../config/database');

/**
 * Create an immutable audit log entry.
 *
 * Audit logs are append-only — they should never be updated or deleted.
 * Every state-changing operation in the system should create an audit entry.
 *
 * @param {object} params - Audit log parameters
 * @param {string} params.tenantId - Tenant ID for multi-tenant isolation
 * @param {string} params.actorId - User ID performing the action
 * @param {string} params.action - Action performed (e.g., 'CREATE', 'UPDATE', 'DELETE', 'SCORE', 'EXPORT')
 * @param {string} params.entityType - Type of entity (e.g., 'Candidate', 'JobDescription', 'ScoreRecord')
 * @param {string} params.entityId - ID of the affected entity
 * @param {object} [params.metadata] - Additional context about the action
 * @returns {Promise<object>} Created audit log entry
 */
async function logAudit({ tenantId, actorId, action, entityType, entityId, metadata = {} }) {
  try {
    const auditEntry = await prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata || {},
      },
    });
    return auditEntry;
  } catch (error) {
    // Audit logging should never crash the main operation
    // Log the error but don't throw
    console.error('[AuditService] Failed to create audit log:', {
      error: error.message,
      tenantId,
      actorId,
      action,
      entityType,
      entityId,
    });
    return null;
  }
}

module.exports = {
  logAudit,
};
