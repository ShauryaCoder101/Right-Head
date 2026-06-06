const path = require('path');
const { prisma } = require('../config/database');
const { parseQueue } = require('../config/queue');
const { extractJdText } = require('../services/ingestion/jd.ingestion');
const { parseJobDescription } = require('../services/parser/jd.parser');
const { logAudit } = require('../services/audit/audit.service');

/**
 * POST /api/v1/jd — Create or upload a job description
 */
async function create(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    let rawText = '';
    let title = req.body.title || '';

    // Extract text from uploaded file, URL, or raw text
    if (req.file) {
      rawText = await extractJdText(req.file, req.file.mimetype);
    } else if (req.body.url) {
      rawText = await extractJdText(null, 'url', req.body.url);
    } else if (req.body.rawText) {
      rawText = req.body.rawText;
    } else {
      return res.status(400).json({ error: 'Provide a file, URL, or rawText' });
    }

    if (!rawText || rawText.trim().length < 20) {
      return res.status(400).json({ error: 'Could not extract sufficient text from the input' });
    }

    // Parse with LLM
    const parsed = await parseJobDescription(rawText);
    if (!title && parsed.title) title = parsed.title;

    const jd = await prisma.jobDescription.create({
      data: {
        tenantId,
        title: title || 'Untitled Position',
        rawSource: rawText,
        parsedRequirements: parsed,
        weightProfile: { skills: 40, experience: 30, education: 15, profile: 15 },
        status: 'DRAFT',
        createdById: actorId,
      },
    });

    await logAudit({ tenantId, actorId, action: 'JD_CREATED', entityType: 'JobDescription', entityId: jd.id, metadata: { title: jd.title } });

    res.status(201).json(jd);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/jd — List JDs for tenant
 */
async function list(req, res, next) {
  try {
    const { tenantId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const search = req.query.search;

    const where = { tenantId };
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [jds, total] = await Promise.all([
      prisma.jobDescription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { scoreRecords: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.jobDescription.count({ where }),
    ]);

    res.json({ jds, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/jd/:id
 */
async function getById(req, res, next) {
  try {
    const jd = await prisma.jobDescription.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { scoreRecords: true, batchJobs: true } },
      },
    });
    if (!jd) return res.status(404).json({ error: 'Job description not found' });
    res.json(jd);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/jd/:id — Update parsed requirements (manual corrections)
 */
async function update(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    const jd = await prisma.jobDescription.findFirst({ where: { id: req.params.id, tenantId } });
    if (!jd) return res.status(404).json({ error: 'Job description not found' });

    const updateData = {};
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.parsedRequirements) updateData.parsedRequirements = req.body.parsedRequirements;
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.screeningInstructions !== undefined) updateData.screeningInstructions = req.body.screeningInstructions;

    const updated = await prisma.jobDescription.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await logAudit({ tenantId, actorId, action: 'JD_UPDATED', entityType: 'JobDescription', entityId: jd.id, metadata: { fields: Object.keys(updateData) } });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/jd/:id/weights — Update scoring weight profile
 */
async function updateWeights(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    const { skills, experience, education, profile, location } = req.body;

    const total = (skills || 0) + (experience || 0) + (education || 0) + (profile || 0) + (location || 0);
    if (Math.abs(total - 100) > 0.1) {
      return res.status(400).json({ error: 'Weights must sum to 100' });
    }

    const jd = await prisma.jobDescription.findFirst({ where: { id: req.params.id, tenantId } });
    if (!jd) return res.status(404).json({ error: 'Job description not found' });

    const updated = await prisma.jobDescription.update({
      where: { id: req.params.id },
      data: { weightProfile: { skills, experience, education, profile, location } },
    });

    await logAudit({ tenantId, actorId, action: 'JD_WEIGHTS_UPDATED', entityType: 'JobDescription', entityId: jd.id, metadata: { skills, experience, education, profile, location } });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/jd/:id
 */
async function remove(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    const jd = await prisma.jobDescription.findFirst({ where: { id: req.params.id, tenantId } });
    if (!jd) return res.status(404).json({ error: 'Job description not found' });

    await prisma.jobDescription.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });

    await logAudit({ tenantId, actorId, action: 'JD_ARCHIVED', entityType: 'JobDescription', entityId: jd.id });

    res.json({ message: 'Job description archived' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, update, updateWeights, remove };
