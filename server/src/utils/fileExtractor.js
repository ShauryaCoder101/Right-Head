// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text content from a file based on its MIME type.
 *
 * Supports PDF, DOCX, and plain text files. Validates that extracted
 * text meets a minimum length threshold to catch image-based PDFs
 * or empty files.
 *
 * @param {string} filePath - Absolute path to the file
 * @param {string} mimeType - MIME type of the file
 * @param {object} [options] - Options
 * @param {number} [options.minLength=50] - Minimum character count for valid extraction
 * @returns {Promise<string>} Extracted plain text
 * @throws {Error} If MIME type is unsupported or text is below minimum length
 */
async function extractText(filePath, mimeType, options = {}) {
  const { minLength = 50 } = options;
  const normalizedMime = (mimeType || '').toLowerCase().trim();
  let text = '';

  try {
    switch (normalizedMime) {
      case 'application/pdf': {
        const buffer = await fs.promises.readFile(filePath);
        const pdfData = await pdfParse(buffer);
        text = pdfData.text || '';
        break;
      }

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword': {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || '';
        break;
      }

      case 'text/plain':
      case 'text/markdown':
      case 'text/csv': {
        text = await fs.promises.readFile(filePath, 'utf-8');
        break;
      }

      default: {
        // Attempt to detect by extension as fallback
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.pdf') {
          const buffer = await fs.promises.readFile(filePath);
          const pdfData = await pdfParse(buffer);
          text = pdfData.text || '';
        } else if (ext === '.docx') {
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value || '';
        } else if (['.txt', '.md', '.csv'].includes(ext)) {
          text = await fs.promises.readFile(filePath, 'utf-8');
        } else {
          throw new Error(
            `Unsupported file type: ${normalizedMime || ext}. Supported types: PDF, DOCX, TXT.`
          );
        }
      }
    }
  } catch (err) {
    if (err.message && err.message.startsWith('Unsupported file type')) {
      throw err;
    }
    throw new Error(`Failed to extract text from file: ${err.message}`);
  }

  // Clean up extracted text
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length < minLength) {
    throw new Error(
      'File could not be parsed — file may be image-based, corrupted, or empty. ' +
        `Extracted only ${text.length} characters (minimum: ${minLength}).`
    );
  }

  return text;
}

/**
 * Detect MIME type from file extension
 * @param {string} filePath - Path to file
 * @returns {string} Best-guess MIME type
 */
function detectMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.rtf': 'application/rtf',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

module.exports = {
  extractText,
  detectMimeType,
};
