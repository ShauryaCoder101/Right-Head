// @ts-check
'use strict';

const { callFullModel } = require('../../config/llm');

const EXPLANATION_SYSTEM_PROMPT = `You are a hiring assistant that generates concise, fair, and actionable candidate evaluation summaries.

CRITICAL RULES:
- Do NOT reference the candidate's name, email, gender, age, or any demographic information.
- Focus ONLY on qualifications, skills, experience, and educational background.
- Be balanced — mention both strengths and gaps honestly.
- Use professional, inclusive language.
- Your recommendation should be data-driven.

Generate a structured explanation in the following JSON format:
{
  "summary": "3-5 sentence plain-English explanation of how the candidate matches the role",
  "key_strengths": ["2-4 bullet points"],
  "notable_gaps": ["1-3 bullet points, or empty if none"],
  "recommendation": "strong match | good match | partial match | weak match",
  "recommendation_detail": "1-2 sentence justification for the recommendation"
}

Output ONLY the JSON object, no markdown or extra text.`;

/**
 * Generate a plain-English explanation card for a candidate's score.
 *
 * Uses GPT-4o (callFullModel) for higher quality natural language output.
 * This is the only place in the scoring pipeline where the full model is used.
 *
 * BIAS MITIGATION: Strips protected attributes before sending to the LLM.
 *
 * @param {object} candidateData - Parsed candidate data
 * @param {object} jdRequirements - Parsed JD requirements
 * @param {object} dimensionScores - Scores from the scoring engine
 * @param {number} dimensionScores.skills - Skills score (0-100)
 * @param {number} dimensionScores.experience - Experience score (0-100)
 * @param {number} dimensionScores.education - Education score (0-100)
 * @param {number} dimensionScores.profile - Profile score (0-100)
 * @returns {Promise<object>} Explanation card with summary, strengths, gaps, recommendation
 */
async function generateExplanation(candidateData, jdRequirements, dimensionScores) {
  // Strip protected attributes
  const sanitized = stripProtected(candidateData);

  const userPrompt = `Generate an evaluation summary for this candidate.

=== SCORES ===
Skills: ${dimensionScores.skills}/100
Experience: ${dimensionScores.experience}/100
Education: ${dimensionScores.education}/100
Profile: ${dimensionScores.profile}/100

=== JOB REQUIREMENTS ===
Title: ${jdRequirements.title || 'Not specified'}
Required Skills: ${(jdRequirements.required_skills || []).join(', ') || 'None'}
Preferred Skills: ${(jdRequirements.preferred_skills || []).join(', ') || 'None'}
Experience: ${formatExperience(jdRequirements.years_of_experience)}
Education: ${jdRequirements.education?.level || 'Not specified'} in ${jdRequirements.education?.field || 'any field'}

=== CANDIDATE ===
Summary: ${sanitized.summary || 'Not provided'}
Skills: ${(sanitized.skills || []).join(', ') || 'None listed'}
Experience: ${sanitized.total_experience_years || 0} years
Education: ${formatCandidateEdu(sanitized.education)}
Certifications: ${(sanitized.certifications || []).join(', ') || 'None'}`;

  try {
    const response = await callFullModel({
      messages: [
        { role: 'system', content: EXPLANATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content.trim();
    const explanation = extractJson(content);

    return {
      summary: explanation.summary || '',
      key_strengths: Array.isArray(explanation.key_strengths) ? explanation.key_strengths : [],
      notable_gaps: Array.isArray(explanation.notable_gaps) ? explanation.notable_gaps : [],
      recommendation: explanation.recommendation || 'partial match',
      recommendation_detail: explanation.recommendation_detail || '',
    };
  } catch (error) {
    // Return a basic explanation if the full model fails
    console.error('[ExplanationGenerator] Failed:', error.message);
    return buildFallbackExplanation(dimensionScores);
  }
}

/**
 * Strip protected attributes for bias prevention
 * @param {object} data
 * @returns {object}
 */
function stripProtected(data) {
  const sanitized = { ...data };
  delete sanitized.name;
  delete sanitized.email;
  delete sanitized.phone;
  delete sanitized.gender;
  delete sanitized.age;
  delete sanitized.date_of_birth;
  delete sanitized.photo;
  delete sanitized.photoUrl;
  return sanitized;
}

/**
 * Build a fallback explanation when LLM fails
 * @param {object} scores
 * @returns {object}
 */
function buildFallbackExplanation(scores) {
  const avg = (scores.skills + scores.experience + scores.education + scores.profile) / 4;
  let recommendation = 'partial match';
  if (avg >= 80) recommendation = 'strong match';
  else if (avg >= 65) recommendation = 'good match';
  else if (avg < 40) recommendation = 'weak match';

  return {
    summary: `The candidate scored ${scores.skills}/100 on skills, ${scores.experience}/100 on experience, ${scores.education}/100 on education, and ${scores.profile}/100 on profile strength.`,
    key_strengths: [],
    notable_gaps: [],
    recommendation,
    recommendation_detail: 'Automated fallback — detailed explanation unavailable.',
  };
}

function formatExperience(exp) {
  if (!exp) return 'Not specified';
  if (exp.min && exp.max) return `${exp.min}-${exp.max} years`;
  if (exp.min) return `${exp.min}+ years`;
  return 'Not specified';
}

function formatCandidateEdu(edu) {
  if (!Array.isArray(edu) || edu.length === 0) return 'None listed';
  return edu.map((e) => `${e.degree} ${e.field} (${e.institution})`).join('; ');
}

function extractJson(content) {
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : content;
  try {
    return JSON.parse(jsonStr);
  } catch {
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (braceMatch) return JSON.parse(braceMatch[0]);
    throw new Error('Could not parse explanation response as JSON');
  }
}

module.exports = {
  generateExplanation,
};
