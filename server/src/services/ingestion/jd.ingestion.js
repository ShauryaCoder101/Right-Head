// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extract text from a Job Description source.
 *
 * Supports PDF file, DOCX file, plain text file, and URL sources.
 * For URLs, intelligently identifies the main content block using
 * common job description selectors.
 *
 * @param {object} [file] - Uploaded file object (from multer)
 * @param {string} [file.path] - File path on disk
 * @param {string} [type] - File type: 'pdf', 'docx', 'txt'
 * @param {string} [url] - URL to fetch JD from
 * @returns {Promise<string>} Extracted plain text
 * @throws {Error} If no valid source is provided or extraction fails
 */
async function extractJdText(file, type, url) {
  // Priority: file > url
  if (file && file.path) {
    return extractFromFile(file.path, type || detectType(file.path));
  }

  if (url) {
    return extractFromUrl(url);
  }

  throw new Error('No valid source provided — supply a file or URL');
}

/**
 * Extract text from a local file
 * @param {string} filePath
 * @param {string} type
 * @returns {Promise<string>}
 */
async function extractFromFile(filePath, type) {
  const normalizedType = (type || '').toLowerCase();

  switch (normalizedType) {
    case 'pdf':
    case 'application/pdf': {
      const buffer = await fs.promises.readFile(filePath);
      const pdfData = await pdfParse(buffer);
      return cleanText(pdfData.text || '');
    }

    case 'docx':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const result = await mammoth.extractRawText({ path: filePath });
      return cleanText(result.value || '');
    }

    case 'txt':
    case 'text/plain': {
      const text = await fs.promises.readFile(filePath, 'utf-8');
      return cleanText(text);
    }

    default: {
      // Fallback: detect from extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.pdf') return extractFromFile(filePath, 'pdf');
      if (ext === '.docx') return extractFromFile(filePath, 'docx');
      if (['.txt', '.md'].includes(ext)) return extractFromFile(filePath, 'txt');
      throw new Error(`Unsupported file type: ${type || ext}`);
    }
  }
}

/**
 * Extract JD text from a URL by fetching the page and parsing main content
 * @param {string} url
 * @returns {Promise<string>}
 */
async function extractFromUrl(url) {
  let response;
  try {
    response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
      maxContentLength: 5 * 1024 * 1024, // 5MB max
    });
  } catch (error) {
    throw new Error(`Failed to fetch URL: ${error.message}`);
  }

  const html = response.data;
  if (typeof html !== 'string') {
    throw new Error('URL did not return HTML content');
  }

  const $ = cheerio.load(html);

  // Remove noise elements
  $('script, style, nav, header, footer, iframe, noscript, svg, img').remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();

  // Try common job description selectors in order of specificity
  const selectors = [
    '.job-description',
    '.job-details',
    '.job-posting',
    '.job-content',
    '[data-testid="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job-description"]',
    '[class*="posting-"]',
    'article',
    '[role="main"]',
    'main',
    '.content',
    '#content',
    '.container',
  ];

  let text = '';

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const candidateText = el.text().trim();
      if (candidateText.length > 200) {
        text = candidateText;
        break;
      }
    }
  }

  // Fallback: find the largest text block in the body
  if (!text || text.length < 200) {
    const body = $('body');
    text = body.text().trim();
  }

  text = cleanText(text);

  if (text.length < 100) {
    throw new Error(
      'Could not extract meaningful content from URL — the page may require JavaScript or login.'
    );
  }

  return text;
}

/**
 * Detect file type from extension
 * @param {string} filePath
 * @returns {string}
 */
function detectType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const typeMap = { '.pdf': 'pdf', '.docx': 'docx', '.doc': 'docx', '.txt': 'txt', '.md': 'txt' };
  return typeMap[ext] || 'txt';
}

/**
 * Clean up extracted text
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  extractJdText,
};
