// @ts-check
'use strict';

const { callFastModel } = require('../../config/llm');

const JD_PARSER_SYSTEM_PROMPT = `You are a precise Job Description (JD) parsing engine. Your task is to extract structured information from a job description text.

RULES:
1. Extract ONLY what is explicitly stated in the text. Do NOT infer or assume.
2. If a field is not mentioned, use null or empty arrays as appropriate.
3. Be precise with skill names — use the exact terms from the JD.
4. Differentiate clearly between REQUIRED and PREFERRED skills.
5. For years of experience, extract the range if stated. "5+ years" → min: 5, max: null. "3-5 years" → min: 3, max: 5.
6. Assign a confidence score (0.0 to 1.0) indicating how well-structured and parseable the JD text was.

OUTPUT FORMAT — respond with ONLY a JSON object:
{
  "title": "string — job title",
  "required_skills": ["array of required/must-have skills"],
  "preferred_skills": ["array of preferred/nice-to-have skills"],
  "years_of_experience": { "min": number|null, "max": number|null },
  "education": { "level": "string (e.g., Bachelor's, Master's, PhD)", "field": "string (e.g., Computer Science)", "required": boolean },
  "location": { "city": "string", "remote": boolean },
  "employment_type": "string (Full-time, Part-time, Contract, etc.)",
  "responsibilities": ["array of key responsibilities"],
  "salary_range": { "min": number|null, "max": number|null, "currency": "string (e.g., USD)" } | null,
  "confidence": 0.0-1.0
}

Do NOT include any text, explanation, or markdown formatting — output ONLY the JSON object.`;

/**
 * Parse a raw job description text into structured data using an LLM.
 *
 * Uses GPT-4o-mini (callFastModel) for cost efficiency.
 *
 * @param {string} rawText - Raw text of the job description
 * @returns {Promise<object>} Parsed job description structure
 * @throws {Error} If LLM call fails or response cannot be parsed
 */
async function parseJobDescription(rawText) {
  if (!rawText || rawText.trim().length < 20) {
    throw new Error('Job description text is too short to parse');
  }

  const truncatedText = rawText.slice(0, 12000); // Limit input to control costs

  try {
    const response = await callFastModel({
      messages: [
        { role: 'system', content: JD_PARSER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Parse the following job description:\n\n---\n${truncatedText}\n---`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content.trim();
    const parsed = extractJson(content);

    // Validate and provide defaults for the parsed structure
    return normalizeJdData(parsed);
  } catch (error) {
    if (error.message && error.message.includes('JSON')) {
      throw new Error('Failed to parse LLM response as structured JD data');
    }
    throw new Error(`JD parsing failed: ${error.message}`);
  }
}

/**
 * Extract JSON from LLM response that might include markdown code fences
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
 * Normalize and validate parsed JD data, providing defaults for missing fields
 * @param {object} data
 * @returns {object}
 */
function normalizeJdData(data) {
  return {
    title: data.title || null,
    required_skills: Array.isArray(data.required_skills) ? data.required_skills : [],
    preferred_skills: Array.isArray(data.preferred_skills) ? data.preferred_skills : [],
    years_of_experience: {
      min: data.years_of_experience?.min ?? null,
      max: data.years_of_experience?.max ?? null,
    },
    education: {
      level: data.education?.level || null,
      field: data.education?.field || null,
      required: data.education?.required ?? false,
    },
    location: {
      city: data.location?.city || null,
      remote: data.location?.remote ?? false,
    },
    employment_type: data.employment_type || null,
    responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
    salary_range: data.salary_range
      ? {
          min: data.salary_range.min ?? null,
          max: data.salary_range.max ?? null,
          currency: data.salary_range.currency || 'USD',
        }
      : null,
    confidence: typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.5,
  };
}

module.exports = {
  parseJobDescription,
};
