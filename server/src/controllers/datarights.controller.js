const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { config } = require('../config/env');
const { sendVerificationCodeEmail, sendDataDeletionEmail } = require('../services/notification/email.service');
const { logAudit } = require('../services/audit/audit.service');

// In-memory store for verification codes (use Redis in production)
const verificationCodes = new Map();

/**
 * POST /api/v1/data-rights/lookup — Send verification code to candidate email
 */
async function lookup(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if candidate exists
    const candidate = await prisma.candidate.findFirst({
      where: { email, deletedAt: null },
    });

    // Always return success (don't reveal if email exists)
    const code = crypto.randomInt(100000, 999999).toString();
    verificationCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    if (candidate) {
      await sendVerificationCodeEmail(email, code);
    }

    res.json({ message: 'If this email exists in our system, a verification code has been sent.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/data-rights/verify — Verify code and return access token
 */
async function verify(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const stored = verificationCodes.get(email);
    if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    verificationCodes.delete(email);

    // Generate a limited-scope token (1 hour)
    const token = jwt.sign(
      { email, scope: 'data-rights' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, expiresIn: 3600 });
  } catch (err) {
    next(err);
  }
}

/** Middleware to verify data-rights token */
function verifyDataRightsToken(req, res, next) {
  const token = req.params.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    if (payload.scope !== 'data-rights') return res.status(403).json({ error: 'Invalid token scope' });
    req.candidateEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * GET /api/v1/data-rights/data/:token — Get all stored data
 */
async function getData(req, res, next) {
  try {
    const candidates = await prisma.candidate.findMany({
      where: { email: req.candidateEmail, deletedAt: null },
      select: {
        name: true, email: true, phone: true,
        parsedData: true, enrichedData: true,
        consentEnrichment: true, tags: true,
        createdAt: true, updatedAt: true,
        scoreRecords: {
          select: { totalScore: true, dimensionScores: true, scoredAt: true, jd: { select: { title: true } } },
        },
      },
    });

    res.json({ candidateRecords: candidates, count: candidates.length });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/data-rights/delete/:token — Request data deletion
 */
async function deleteData(req, res, next) {
  try {
    const result = await prisma.candidate.updateMany({
      where: { email: req.candidateEmail, deletedAt: null },
      data: {
        deletedAt: new Date(),
        parsedData: null,
        enrichedData: null,
        phone: null,
      },
    });

    if (result.count > 0) {
      await sendDataDeletionEmail(req.candidateEmail);
    }

    res.json({
      message: 'Data deletion request received. Your data will be permanently removed within 30 days.',
      recordsAffected: result.count,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/data-rights/consent/:token — Update enrichment consent
 */
async function updateConsent(req, res, next) {
  try {
    const { consentEnrichment } = req.body;

    await prisma.candidate.updateMany({
      where: { email: req.candidateEmail, deletedAt: null },
      data: { consentEnrichment: !!consentEnrichment },
    });

    res.json({
      message: `Enrichment consent ${consentEnrichment ? 'granted' : 'revoked'}`,
      consentEnrichment: !!consentEnrichment,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { lookup, verify, verifyDataRightsToken, getData, deleteData, updateConsent };
