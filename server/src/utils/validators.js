// @ts-check
'use strict';

const { z } = require('zod');

/**
 * Schema for user registration
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase, one uppercase, and one digit'
    ),
  name: z.string().min(1, 'Name is required').max(255),
  companyName: z.string().min(1, 'Company name is required').max(255).optional(),
});

/**
 * Schema for user login
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Schema for creating a Job Description
 * At least one of rawText, url, or file (handled at controller level) must be provided
 */
const jdCreateSchema = z
  .object({
    title: z.string().max(500).optional(),
    rawText: z.string().max(50000).optional(),
    url: z.string().url('Invalid URL').optional(),
  })
  .refine(
    (data) => data.rawText || data.url,
    { message: 'Either rawText, url, or a file upload is required' }
  );

/**
 * Schema for updating JD parsed requirements
 */
const jdUpdateSchema = z.object({
  title: z.string().max(500).optional(),
  parsedRequirements: z
    .object({
      required_skills: z.array(z.string()).optional(),
      preferred_skills: z.array(z.string()).optional(),
      years_of_experience: z
        .object({
          min: z.number().nullable().optional(),
          max: z.number().nullable().optional(),
        })
        .optional(),
      education: z
        .object({
          level: z.string().optional(),
          field: z.string().optional(),
          required: z.boolean().optional(),
        })
        .optional(),
      location: z
        .object({
          city: z.string().optional(),
          remote: z.boolean().optional(),
        })
        .optional(),
      employment_type: z.string().optional(),
      responsibilities: z.array(z.string()).optional(),
      salary_range: z
        .object({
          min: z.number().nullable().optional(),
          max: z.number().nullable().optional(),
          currency: z.string().optional(),
        })
        .nullable()
        .optional(),
    })
    .optional(),
});

/**
 * Schema for scoring run request
 */
const scoringRunSchema = z.object({
  jdId: z.string().uuid('Invalid JD ID'),
  candidateIds: z.array(z.string().uuid()).optional(),
  generateExplanation: z.boolean().optional().default(false),
});

/**
 * Schema for re-screening request
 */
const rescreenSchema = z.object({
  jdId: z.string().uuid('Invalid JD ID'),
  filters: z
    .object({
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      batchId: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Schema for weight profiles — must sum to 100
 */
const weightSchema = z
  .object({
    skills: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    education: z.number().min(0).max(100),
    profile: z.number().min(0).max(100),
  })
  .refine(
    (data) => data.skills + data.experience + data.education + data.profile === 100,
    { message: 'Weight values must sum to 100' }
  );

/**
 * Schema for rerank request
 */
const rerankSchema = z.object({
  jdId: z.string().uuid('Invalid JD ID'),
  weights: weightSchema,
});

/**
 * Schema for data rights email lookup
 */
const dataRightsLookupSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Schema for data rights verification
 */
const dataRightsVerifySchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

/**
 * Schema for candidate update
 */
const candidateUpdateSchema = z.object({
  tags: z.array(z.string()).optional(),
  parsedData: z.record(z.any()).optional(),
});

/**
 * Schema for pagination query params
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for candidate list filters
 */
const candidateListSchema = paginationSchema.extend({
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  sourceBatch: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

/**
 * Schema for scoring results query
 */
const scoringResultsSchema = paginationSchema.extend({
  sortBy: z.enum(['totalScore', 'skillsScore', 'experienceScore', 'educationScore', 'profileScore']).optional().default('totalScore'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  minScore: z.coerce.number().min(0).max(100).optional(),
  location: z.string().optional(),
  skills: z.string().optional(), // comma-separated
});

/**
 * Schema for consent update
 */
const consentUpdateSchema = z.object({
  enrichmentConsent: z.boolean(),
});

/**
 * Validate request body against a schema. Returns parsed data or throws.
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {object} data - Data to validate
 * @returns {{ success: true, data: any } | { success: false, errors: any[] }}
 */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  jdCreateSchema,
  jdUpdateSchema,
  scoringRunSchema,
  rescreenSchema,
  weightSchema,
  rerankSchema,
  dataRightsLookupSchema,
  dataRightsVerifySchema,
  candidateUpdateSchema,
  candidateListSchema,
  paginationSchema,
  scoringResultsSchema,
  consentUpdateSchema,
  validate,
};
