const { prisma } = require('../config/database');
const { parseQueue } = require('../config/queue');
const { logAudit } = require('../services/audit/audit.service');
const { findDuplicate } = require('../utils/deduplication');
const { extractText } = require('../utils/fileExtractor');
const { parseResume } = require('../services/parser/resume.parser');

/**
 * POST /api/v1/candidates/upload — Batch upload resumes
 */
async function upload(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    const jdId = req.body.jdId;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Create batch job
    const batchJob = await prisma.batchJob.create({
      data: {
        tenantId,
        jdId: jdId || null,
        status: 'RUNNING',
        jobType: 'PARSE',
        totalCount: files.length,
        doneCount: 0,
        failedCount: 0,
        startedAt: new Date(),
      },
    });

    // Create candidate records
    const candidateIds = [];
    const candidates = [];
    for (const file of files) {
      const candidate = await prisma.candidate.create({
        data: {
          tenantId,
          name: file.originalname.replace(/\.(pdf|docx|txt)$/i, ''),
          rawResumeUrl: file.path,
          sourceBatch: batchJob.id,
          tags: jdId ? [jdId] : [],
        },
      });
      candidateIds.push(candidate.id);
      candidates.push({ id: candidate.id, file });
    }

    await logAudit({
      tenantId, actorId, action: 'RESUMES_UPLOADED',
      entityType: 'BatchJob', entityId: batchJob.id,
      metadata: { fileCount: files.length, jdId },
    });

    // Respond immediately — parsing happens in background
    res.status(202).json({
      batchJobId: batchJob.id,
      totalFiles: files.length,
      candidateIds,
      message: `${files.length} resumes uploaded, parsing in progress...`,
    });

    // Parse inline (no Redis required) — runs after response is sent
    let doneCount = 0;
    let failedCount = 0;
    for (const { id, file } of candidates) {
      try {
        console.log(`📄 Parsing resume: ${file.originalname}`);
        const rawText = await extractText(file.path, file.mimetype);
        const parsed = await parseResume(rawText);

        await prisma.candidate.update({
          where: { id },
          data: {
            name: parsed.name || file.originalname.replace(/\.(pdf|docx|txt)$/i, ''),
            email: parsed.email || null,
            phone: parsed.phone || null,
            parsedData: parsed,
          },
        });
        doneCount++;
        console.log(`✅ Parsed: ${parsed.name || file.originalname} (${doneCount}/${files.length})`);
      } catch (err) {
        failedCount++;
        console.error(`❌ Failed to parse ${file.originalname}: ${err.message}`);
      }

      // Update batch progress
      await prisma.batchJob.update({
        where: { id: batchJob.id },
        data: { doneCount, failedCount },
      });
    }

    // Mark batch complete
    await prisma.batchJob.update({
      where: { id: batchJob.id },
      data: {
        status: failedCount === files.length ? 'FAILED' : 'DONE',
        doneCount,
        failedCount,
        completedAt: new Date(),
      },
    });
    console.log(`🏁 Batch ${batchJob.id} complete: ${doneCount} parsed, ${failedCount} failed`);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/candidates — List candidates with pagination and search
 */
async function list(req, res, next) {
  try {
    const { tenantId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const tags = req.query.tags ? req.query.tags.split(',') : null;

    const where = { tenantId, deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tags) where.tags = { hasSome: tags };

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, email: true, phone: true,
          parsedData: true, tags: true, sourceBatch: true,
          consentEnrichment: true, createdAt: true, updatedAt: true,
          _count: { select: { scoreRecords: true } },
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    res.json({ candidates, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/candidates/:id
 */
async function getById(req, res, next) {
  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
      include: {
        scoreRecords: {
          orderBy: { scoredAt: 'desc' },
          include: { jd: { select: { id: true, title: true } } },
        },
      },
    });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/candidates/:id — Update tags or corrections
 */
async function update(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    const candidate = await prisma.candidate.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const updateData = {};
    if (req.body.tags) updateData.tags = req.body.tags;
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.parsedData) updateData.parsedData = req.body.parsedData;

    const updated = await prisma.candidate.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await logAudit({ tenantId, actorId, action: 'CANDIDATE_UPDATED', entityType: 'Candidate', entityId: req.params.id });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/candidates/:id/data — GDPR data deletion
 */
async function deleteData(req, res, next) {
  try {
    const { tenantId, id: actorId } = req.user;
    const candidate = await prisma.candidate.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    await prisma.candidate.update({
      where: { id: req.params.id },
      data: {
        deletedAt: new Date(),
        parsedData: null,
        enrichedData: null,
        phone: null,
      },
    });

    await logAudit({
      tenantId, actorId, action: 'CANDIDATE_DATA_DELETED',
      entityType: 'Candidate', entityId: req.params.id,
      metadata: { reason: 'GDPR deletion request' },
    });

    res.json({ message: 'Candidate data marked for deletion. Will be permanently removed within 30 days.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/candidates/batch/:batchId — Get batch job status
 */
async function getBatchStatus(req, res, next) {
  try {
    const batch = await prisma.batchJob.findFirst({
      where: { id: req.params.batchId, tenantId: req.user.tenantId },
    });
    if (!batch) return res.status(404).json({ error: 'Batch job not found' });
    res.json(batch);
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, list, getById, update, deleteData, getBatchStatus };
