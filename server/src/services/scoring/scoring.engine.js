// @ts-check
'use strict';

const { callFastModel } = require('../../config/llm');

const SCORING_SYSTEM_PROMPT = `You are an objective candidate-evaluation engine. You score a candidate against job requirements across four dimensions.

CRITICAL RULES FOR BIAS PREVENTION:
- You will NOT receive any candidate name, email, phone, gender, age, or photo.
- Judge ONLY on qualifications, skills, experience, and education.
- Do NOT make assumptions about the candidate based on institution prestige, company brand, or location stereotypes.

SCORING DIMENSIONS (each 0-100):

1. skills_score: Evaluate the candidate's skills against the job requirements.
   - Match required skills (each missing critical skill: -15 points from baseline 100)
   - Partial credit for related/similar skills (semantic similarity)
   - Bonus for preferred skills (up to +10 from base)
   - Consider depth/breadth of technical skills

2. experience_score: Evaluate work experience relevance.
   - Years of experience vs. required range
   - Industry/domain relevance
   - Seniority/title alignment
   - Quality and relevance of past responsibilities

3. education_score: Evaluate educational background.
   - Degree level vs. requirements (PhD=100, Master's=85, Bachelor's=70, Associate=50, None=30)
   - Field alignment (exact match=full credit, related field=70%, unrelated=40%)
   - Relevant certifications (+5-15 points)
   - Adjust if education is not required by JD

4. profile_score: Score based on overall profile strength.
   - Default to 50 if no enrichment data is available
   - Consider projects, publications, open-source contributions
   - Consider professional certifications and continuous learning
   - Consider industry involvement

5. location_score: Evaluate location match.
   - If JD specifies a location, check if candidate is in the same city/region (100=exact match, 80=same state/region, 50=same country, 30=different country, 50=remote-friendly or location unknown)
   - If JD does not specify a location or is remote, default to 70

OUTPUT FORMAT — respond with ONLY a JSON object:
{
  "skills_score": number (0-100),
  "experience_score": number (0-100),
  "education_score": number (0-100),
  "profile_score": number (0-100),
  "location_score": number (0-100),
  "match_notes": {
    "key_strengths": ["array of 2-4 key strengths"],
    "key_gaps": ["array of notable gaps or concerns"],
    "critical_missing_skills": ["required skills the candidate lacks"]
  },
  "flags": ["array of any red flags or notable observations"]
}

Be calibrated: a perfect match is 90-100, a strong match is 75-90, a good match is 60-75, a partial match is 40-60, and a weak match is below 40.
Do NOT include any text, explanation, or markdown formatting — output ONLY the JSON object.`;

/**
 * Score a candidate against job description requirements.
 *
 * BIAS MITIGATION: Strips all protected attributes (name, email, phone,
 * gender, age, photo) before sending candidate data to the LLM.
 *
 * Uses GPT-4o-mini for cost efficiency. Computes a weighted composite
 * score from four dimension scores.
 *
 * @param {object} candidateData - Parsed candidate data
 * @param {object} jdRequirements - Parsed JD requirements
 * @param {object} [weightProfile] - Custom weight profile
 * @param {number} [weightProfile.skills=40] - Skills weight (0-100)
 * @param {number} [weightProfile.experience=30] - Experience weight (0-100)
 * @param {number} [weightProfile.education=15] - Education weight (0-100)
 * @param {number} [weightProfile.profile=15] - Profile weight (0-100)
 * @returns {Promise<object>} Scoring result with totalScore, dimensionScores, matchNotes, flags
 */
async function scoreCandidate(candidateData, jdRequirements, weightProfile = null, extraInstructions = null) {
  const weights = normalizeWeights(weightProfile);

  // BIAS MITIGATION: Strip protected attributes
  const sanitizedCandidate = stripProtectedAttributes(candidateData);

  // Build the evaluation prompt
  const userPrompt = buildScoringPrompt(sanitizedCandidate, jdRequirements);

  try {
    const response = await callFastModel({
      messages: [
        { role: 'system', content: SCORING_SYSTEM_PROMPT },
        { role: 'user', content: extraInstructions
          ? `${userPrompt}\n\n--- ADDITIONAL SCREENING INSTRUCTIONS ---\n${extraInstructions}`
          : userPrompt },
      ],
      temperature: 0.15,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content.trim();
    console.log(`📊 Scoring LLM response (first 200 chars): ${content.substring(0, 200)}`);

    let scores;
    try {
      scores = extractJson(content);
    } catch (err) {
      console.error(`❌ Scoring JSON extraction failed. Response:\n${content.substring(0, 500)}`);
      throw err;
    }

    // Validate dimension scores
    const dimensionScores = {
      skills: clampScore(scores.skills_score),
      experience: clampScore(scores.experience_score),
      education: clampScore(scores.education_score),
      profile: clampScore(scores.profile_score),
      location: clampScore(scores.location_score),
    };

    // Compute weighted composite score
    const totalScore = computeComposite(dimensionScores, weights);

    return {
      totalScore,
      dimensionScores,
      matchNotes: scores.match_notes || {
        key_strengths: [],
        key_gaps: [],
        critical_missing_skills: [],
      },
      flags: Array.isArray(scores.flags) ? scores.flags : [],
      weightsUsed: weights,
    };
  } catch (error) {
    throw new Error(`Scoring failed: ${error.message}`);
  }
}

/**
 * Strip protected attributes to prevent bias in LLM scoring
 * @param {object} data - Candidate data
 * @returns {object} Sanitized candidate data
 */
function stripProtectedAttributes(data) {
  const sanitized = { ...data };

  // Remove protected fields
  delete sanitized.name;
  delete sanitized.email;
  delete sanitized.phone;
  delete sanitized.gender;
  delete sanitized.age;
  delete sanitized.date_of_birth;
  delete sanitized.photo;
  delete sanitized.photoUrl;
  delete sanitized.marital_status;
  delete sanitized.nationality;
  delete sanitized.ethnicity;
  delete sanitized.religion;

  // Strip names from work experience citations
  if (sanitized.work_experience) {
    sanitized.work_experience = sanitized.work_experience.map((exp) => {
      const { source_citation, ...rest } = exp;
      return rest;
    });
  }

  return sanitized;
}

/**
 * Build the scoring prompt from sanitized candidate and JD data
 * @param {object} candidate
 * @param {object} jd
 * @returns {string}
 */
function buildScoringPrompt(candidate, jd) {
  return `Evaluate this candidate against the job requirements.

=== JOB REQUIREMENTS ===
Title: ${jd.title || 'Not specified'}
Required Skills: ${(jd.required_skills || []).join(', ') || 'None specified'}
Preferred Skills: ${(jd.preferred_skills || []).join(', ') || 'None specified'}
Experience Required: ${formatExperience(jd.years_of_experience)}
Education: ${formatEducation(jd.education)}
Responsibilities: ${(jd.responsibilities || []).slice(0, 8).join('; ') || 'Not specified'}

=== CANDIDATE PROFILE ===
Summary: ${candidate.summary || 'Not provided'}
Skills: ${(candidate.skills || []).join(', ') || 'None listed'}
Total Experience: ${candidate.total_experience_years || 0} years
Education: ${formatCandidateEducation(candidate.education)}
Work Experience: ${formatWorkExperience(candidate.work_experience)}
Certifications: ${(candidate.certifications || []).join(', ') || 'None'}
Projects: ${formatProjects(candidate.projects)}

Score this candidate across all five dimensions (skills, experience, education, profile, location).`;
}

/**
 * Format experience requirement for the prompt
 * @param {object} exp
 * @returns {string}
 */
function formatExperience(exp) {
  if (!exp) return 'Not specified';
  if (exp.min && exp.max) return `${exp.min}-${exp.max} years`;
  if (exp.min) return `${exp.min}+ years`;
  if (exp.max) return `Up to ${exp.max} years`;
  return 'Not specified';
}

/**
 * Format education requirement for the prompt
 * @param {object} edu
 * @returns {string}
 */
function formatEducation(edu) {
  if (!edu) return 'Not specified';
  const parts = [];
  if (edu.level) parts.push(edu.level);
  if (edu.field) parts.push(`in ${edu.field}`);
  if (edu.required) parts.push('(required)');
  return parts.join(' ') || 'Not specified';
}

/**
 * Format candidate education for the prompt
 * @param {Array} education
 * @returns {string}
 */
function formatCandidateEducation(education) {
  if (!Array.isArray(education) || education.length === 0) return 'None listed';
  return education
    .map((e) => `${e.degree || ''} ${e.field || ''} from ${e.institution || 'unknown'} (${e.year || 'N/A'})`)
    .join('; ');
}

/**
 * Format work experience for the prompt
 * @param {Array} experience
 * @returns {string}
 */
function formatWorkExperience(experience) {
  if (!Array.isArray(experience) || experience.length === 0) return 'None listed';
  return experience
    .slice(0, 5) // Limit to 5 most recent
    .map(
      (e) =>
        `${e.title || 'Role'} at ${e.company || 'Company'} (${e.start_date || '?'} - ${e.end_date || 'Present'}, ${e.duration_months || '?'}mo): ${(e.responsibilities || []).slice(0, 3).join('; ')}`
    )
    .join('\n');
}

/**
 * Format projects for the prompt
 * @param {Array} projects
 * @returns {string}
 */
function formatProjects(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return 'None';
  return projects
    .slice(0, 3)
    .map((p) => `${p.name || 'Project'}: ${p.description || ''} [${(p.technologies || []).join(', ')}]`)
    .join('; ');
}

/**
 * Compute weighted composite score
 * @param {object} dimensions
 * @param {object} weights
 * @returns {number}
 */
function computeComposite(dimensions, weights) {
  const raw =
    (dimensions.skills * weights.skills +
      dimensions.experience * weights.experience +
      dimensions.education * weights.education +
      dimensions.profile * weights.profile +
      (dimensions.location || 0) * (weights.location || 0)) /
    100;
  return Math.round(raw * 100) / 100;
}

/**
 * Normalize weight profile with defaults
 * @param {object|null} weights
 * @returns {object}
 */
function normalizeWeights(weights) {
  if (!weights) {
    return { skills: 35, experience: 25, education: 15, profile: 15, location: 10 };
  }
  return {
    skills: weights.skills ?? 35,
    experience: weights.experience ?? 25,
    education: weights.education ?? 15,
    profile: weights.profile ?? 15,
    location: weights.location ?? 10,
  };
}

/**
 * Clamp a score between 0 and 100
 * @param {number} score
 * @returns {number}
 */
function clampScore(score) {
  if (typeof score !== 'number' || isNaN(score)) return 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Extract JSON from LLM response
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

  throw new Error('Could not parse scoring response as JSON');
}

module.exports = {
  scoreCandidate,
  computeComposite,
  stripProtectedAttributes,
};
