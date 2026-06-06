// @ts-check
'use strict';

const { callFastModel } = require('../../config/llm');

const RESUME_PARSER_SYSTEM_PROMPT = `You are a precise resume/CV parsing engine. Your task is to extract structured data from a resume text WITH source citations.

CRITICAL RULES:
1. For each extracted field, include the "source_citation" — the EXACT quote (or closest matching phrase) from the resume text that supports the extracted value.
2. Extract ONLY what is explicitly stated. Do NOT infer or fabricate information.
3. If a field is ambiguous or uncertain, set parse_confidence lower and flag it.
4. For work experience dates, compute duration_months from start_date to end_date (or to present if end_date is null).
5. Total experience years should be the sum of all non-overlapping work periods.
6. Skills should include both explicit skills sections AND skills mentioned in work experience.
7. Be conservative — if something could be a skill or a tool name, include it.

OUTPUT FORMAT — respond with ONLY a JSON object:
{
  "name": "string — full name",
  "email": "string|null",
  "phone": "string|null",
  "location": "string|null — city, state/country",
  "summary": "string|null — professional summary or objective",
  "education": [
    {
      "degree": "string (e.g., Bachelor of Science)",
      "field": "string (e.g., Computer Science)",
      "institution": "string",
      "year": number|null,
      "source_citation": "exact quote from resume"
    }
  ],
  "work_experience": [
    {
      "company": "string",
      "title": "string — job title",
      "start_date": "string (YYYY-MM or YYYY)",
      "end_date": "string|null (YYYY-MM, YYYY, or null if current)",
      "duration_months": number,
      "responsibilities": ["key responsibilities/achievements"],
      "source_citation": "exact quote from resume"
    }
  ],
  "skills": ["array of all skills mentioned"],
  "certifications": ["array of certifications"],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["tech stack used"]
    }
  ],
  "publications": ["array of publication titles or references"],
  "total_experience_years": number,
  "parse_confidence": 0.0-1.0,
  "low_confidence_fields": ["array of field names where extraction was uncertain"]
}

Do NOT include any text, explanation, or markdown formatting — output ONLY the JSON object.`;

/**
 * Parse a raw resume text into structured data using an LLM.
 *
 * Uses GPT-4o-mini (callFastModel) for cost efficiency. The prompt
 * requires source citations for each extracted field to enable
 * verification and auditability.
 *
 * @param {string} rawText - Raw text extracted from the resume file
 * @returns {Promise<object>} Parsed resume data with source citations
 * @throws {Error} If LLM call fails or response cannot be parsed
 */
async function parseResume(rawText) {
  if (!rawText || rawText.trim().length < 30) {
    throw new Error('Resume text is too short to parse meaningfully');
  }

  const truncatedText = rawText.slice(0, 15000); // Control token usage

  const response = await callFastModel({
    messages: [
      { role: 'system', content: RESUME_PARSER_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Parse the following resume:\n\n---\n${truncatedText}\n---`,
      },
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  const content = response.choices[0].message.content.trim();
  console.log(`📋 LLM resume response (first 300 chars): ${content.substring(0, 300)}`);

  try {
    const parsed = extractJson(content);
    return normalizeResumeData(parsed);
  } catch (error) {
    console.error(`❌ JSON extraction failed. Full LLM response:\n${content.substring(0, 1000)}`);
    throw new Error(`Resume parsing failed: could not extract JSON from LLM response`);
  }
}

/**
 * Extract JSON from LLM response (handles markdown code fences, thinking tags, etc.)
 * @param {string} content
 * @returns {object}
 */
function extractJson(content) {
  // Strip <think>...</think> tags (Gemini sometimes adds these)
  let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Try markdown code fence first
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }

  // Try direct parse
  try { return JSON.parse(cleaned); } catch {}

  // Try extracting the largest JSON object
  const braceMatch = cleaned.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch {}
  }

  throw new Error('Could not extract valid JSON from LLM response');
}

/**
 * Normalize and validate parsed resume data
 * @param {object} data
 * @returns {object}
 */
function normalizeResumeData(data) {
  return {
    name: data.name || 'Unknown',
    email: data.email || null,
    phone: data.phone || null,
    location: data.location || null,
    summary: data.summary || null,
    education: Array.isArray(data.education)
      ? data.education.map((edu) => ({
          degree: edu.degree || '',
          field: edu.field || '',
          institution: edu.institution || '',
          year: edu.year || null,
          source_citation: edu.source_citation || '',
        }))
      : [],
    work_experience: Array.isArray(data.work_experience)
      ? data.work_experience.map((exp) => ({
          company: exp.company || '',
          title: exp.title || '',
          start_date: exp.start_date || '',
          end_date: exp.end_date || null,
          duration_months: exp.duration_months || 0,
          responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : [],
          source_citation: exp.source_citation || '',
        }))
      : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
    projects: Array.isArray(data.projects)
      ? data.projects.map((proj) => ({
          name: proj.name || '',
          description: proj.description || '',
          technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
        }))
      : [],
    publications: Array.isArray(data.publications) ? data.publications : [],
    total_experience_years:
      typeof data.total_experience_years === 'number' ? data.total_experience_years : 0,
    parse_confidence:
      typeof data.parse_confidence === 'number'
        ? Math.max(0, Math.min(1, data.parse_confidence))
        : 0.5,
    low_confidence_fields: Array.isArray(data.low_confidence_fields)
      ? data.low_confidence_fields
      : [],
  };
}

module.exports = {
  parseResume,
};
