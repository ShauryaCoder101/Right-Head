const { generateCsvExport } = require('../services/export/csv.export');
const { generatePdfReport, generateCandidatePdf } = require('../services/export/pdf.export');

/**
 * GET /api/v1/export/csv/:jdId
 */
async function exportCsv(req, res, next) {
  try {
    const { jdId } = req.params;
    const { tenantId } = req.user;
    const minScore = parseInt(req.query.minScore) || 0;

    const { csv, filename } = await generateCsvExport(jdId, tenantId, { minScore });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/export/pdf/:jdId
 */
async function exportPdf(req, res, next) {
  try {
    const { jdId } = req.params;
    const { tenantId } = req.user;

    const { buffer, filename } = await generatePdfReport(jdId, tenantId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/export/pdf/candidate/:candidateId/:jdId
 */
async function exportCandidatePdf(req, res, next) {
  try {
    const { candidateId, jdId } = req.params;
    const { tenantId } = req.user;

    const { buffer, filename } = await generateCandidatePdf(candidateId, jdId, tenantId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportCsv, exportPdf, exportCandidatePdf };
