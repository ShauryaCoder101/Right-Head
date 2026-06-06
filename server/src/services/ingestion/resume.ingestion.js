// @ts-check
'use strict';

const { extractText } = require('../../utils/fileExtractor');

/**
 * Extract text content from a resume file.
 *
 * Supports PDF, DOCX, and plain text formats. Validates that the
 * extracted text contains sufficient content to be a real resume
 * (minimum 50 characters).
 *
 * @param {string} filePath - Absolute path to the resume file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Extracted plain text from the resume
 * @throws {Error} If file cannot be parsed or contains insufficient text
 */
async function extractResumeText(filePath, mimeType) {
  try {
    const text = await extractText(filePath, mimeType, { minLength: 50 });
    return text;
  } catch (error) {
    if (error.message && error.message.includes('File could not be parsed')) {
      throw new Error(
        'Resume could not be parsed — file may be image-based or empty. ' +
          'Please upload a text-based PDF, DOCX, or TXT file.'
      );
    }
    throw error;
  }
}

module.exports = {
  extractResumeText,
};
