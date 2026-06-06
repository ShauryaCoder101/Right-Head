# 📌 Assumptions — RecruitIQ (RAIS)

> **Document ID:** ASM-RAIS-001 · **Version:** 1.0  
> **Last Updated:** 2026-05-30  
> **Status:** Living Document — updated as assumptions are validated or invalidated

This document captures all assumptions made during the design and implementation of the AI-Powered Resume Screening System. Each assumption is categorized, assigned a risk level, and linked to a validation strategy. Invalidation of any **High-risk** assumption requires an immediate design review.

---

## Table of Contents

- [1. Technical Assumptions](#1-technical-assumptions)
- [2. LLM & AI Assumptions](#2-llm--ai-assumptions)
- [3. Data & Storage Assumptions](#3-data--storage-assumptions)
- [4. Integration Assumptions](#4-integration-assumptions)
- [5. Security & Compliance Assumptions](#5-security--compliance-assumptions)
- [6. Business & Operational Assumptions](#6-business--operational-assumptions)
- [7. User & UX Assumptions](#7-user--ux-assumptions)
- [8. Infrastructure & Deployment Assumptions](#8-infrastructure--deployment-assumptions)
- [9. Assumption Validation Tracker](#9-assumption-validation-tracker)

---

## 1. Technical Assumptions

| ID | Assumption | Risk | Validation Strategy |
|---|---|---|---|
| TA-01 | **Node.js 20+ and Express.js** are sufficient for all backend services at the projected scale (50k resumes/tenant). No need for Go/Rust/Java microservices at launch. | Medium | Load test at 2× projected scale before Phase 4 |
| TA-02 | **PostgreSQL with JSONB** columns can handle the semi-structured nature of parsed resumes and JDs without requiring a dedicated document store (MongoDB, Elasticsearch). | Medium | Benchmark query performance at 50k candidates with complex JSONB filters |
| TA-03 | **BullMQ + Redis** provides adequate job queue reliability for batch scoring. Message loss is acceptable to be mitigated by retry logic rather than requiring a managed queue (SQS). | Medium | Chaos testing in staging: kill Redis mid-batch, verify recovery |
| TA-04 | **Prisma ORM** supports all required PostgreSQL features (JSONB queries, row-level security, upserts, soft deletes) without requiring raw SQL for >90% of queries. | Low | Spike on complex JSONB queries during Phase 1 |
| TA-05 | **pdf-parse** and **mammoth** libraries can extract readable text from ≥95% of resumes encountered in the wild. Graphic-heavy and scanned PDFs are explicitly out of scope and will be rejected. | Medium | Test against a corpus of 500+ real-world resumes of varied formats |
| TA-06 | The system will run in a **containerised environment** (Docker) for both development and production. All developers have Docker Desktop or equivalent available. | Low | Verify during onboarding |
| TA-07 | **Vite + React 18** is the frontend framework. No SSR is required; the SPA model is sufficient for an internal tool / B2B SaaS dashboard. | Low | N/A — design decision |
| TA-08 | A **monorepo structure** (client + server in one repo) is manageable for the team size during Phase 1–3. Splitting into separate repos may be evaluated for Phase 4+. | Low | Review at Phase 3 retrospective |

---

## 2. LLM & AI Assumptions

| ID | Assumption | Risk | Validation Strategy |
|---|---|---|---|
| LA-01 | **OpenAI GPT-4o-mini** (or equivalent: Claude Haiku) is accurate enough for structured field extraction from resumes and JDs, achieving ≥90% field-level accuracy without fine-tuning. | High | Benchmark against 200 manually annotated resumes; measure precision/recall per field |
| LA-02 | A **tiered LLM strategy** (cheap model for parsing/scoring, expensive model for explanation cards only) keeps per-resume cost under **$0.02** at scale. | High | Cost audit after processing 1,000 resumes in staging |
| LA-03 | **Prompt engineering alone** (without fine-tuning) is sufficient for Phase 1–3 accuracy targets. Fine-tuning may be explored in Phase 4+. | Medium | Track accuracy metrics monthly; trigger fine-tuning evaluation if accuracy drops below 85% |
| LA-04 | LLM providers (OpenAI, Anthropic) will maintain **API backward compatibility** for the models used, or provide ≥90 days deprecation notice for migration. | Medium | Subscribe to provider changelogs; abstract LLM calls behind an adapter interface |
| LA-05 | **Semantic similarity** for skill matching (e.g., "React.js" ≈ "ReactJS" ≈ "React") can be handled by the LLM within the scoring prompt without a separate embedding pipeline in Phase 1. | Medium | Evaluate with 50 skill synonym pairs; if accuracy < 80%, add embedding-based matching |
| LA-06 | The LLM can reliably **cite source sentences** from the resume text for each extracted field, enabling the "low-confidence flag" mechanism. | Medium | Test with 100 resumes; verify citation accuracy |
| LA-07 | **Batch API pricing** from LLM providers (where available) will remain ≥40% cheaper than real-time API calls, making async batch scoring economically viable. | Medium | Monitor pricing changes quarterly |
| LA-08 | LLM responses for scoring can be constrained to **structured JSON output** (using function calling / structured outputs) with ≥98% valid JSON rate. | Low | Use JSON mode / function calling; implement retry on malformed responses |

---

## 3. Data & Storage Assumptions

| ID | Assumption | Risk | Validation Strategy |
|---|---|---|---|
| DA-01 | **Average resume file size** is ≤5 MB. The 25 MB upload limit accommodates edge cases (image-heavy resumes, portfolios). | Low | Monitor upload size distribution in production |
| DA-02 | **Average parsed candidate JSON** is ≤50 KB. A pool of 50,000 candidates generates ~2.5 GB of parsed data — within PostgreSQL comfort zone. | Low | Measure after parsing 1,000 real resumes |
| DA-03 | **Score vectors** (dimension scores per candidate-JD pair) are small enough to store inline in PostgreSQL JSONB rather than requiring a vector database. | Low | N/A — score vectors are simple numeric arrays, not embeddings |
| DA-04 | **30-day enrichment cache** is sufficient. Profile data older than 30 days is stale enough to warrant re-fetch, but fresh enough to avoid excessive API calls. | Low | Gather recruiter feedback on data freshness after Phase 2 |
| DA-05 | **Soft deletes** (setting `deleted_at`) are sufficient for GDPR compliance in the application layer. A scheduled job hard-deletes soft-deleted records after 30 days. | Medium | Legal review of deletion process before Phase 5 |
| DA-06 | **Tenant isolation via row-level filtering** (tenant_id column) is adequate for Phase 1–3. Schema-level or database-level isolation is not required until enterprise tier. | Medium | Security review before multi-tenant launch |
| DA-07 | The system does **not** need to support resume image/scan OCR. Resumes that cannot be text-extracted are rejected with a clear error. This is stated in the SRS (FR-RS-03). | Low | N/A — explicit SRS constraint |

---

## 4. Integration Assumptions

| ID | Assumption | Risk | Validation Strategy |
|---|---|---|---|
| IA-01 | **LinkedIn OAuth API** provides access to: current role, endorsements, recommendation count, and activity recency for candidates who have granted consent. LinkedIn's API scope and rate limits permit this at scale. | High | Apply for LinkedIn API partnership; test with 50 consented profiles before Phase 2 launch |
| IA-02 | **GitHub REST API** (unauthenticated or with PAT) provides sufficient data: public repos, languages, contribution activity, stars. Rate limits (60 req/hr unauthenticated, 5000/hr with PAT) are manageable with caching. | Medium | Calculate expected API call volume per batch; implement rate-limit-aware queuing |
| IA-03 | **ATS integrations** (Greenhouse, Lever, Workday) provide stable webhook/API endpoints that allow pushing candidate scores and pulling job descriptions. Integration development effort is ~2-3 weeks per ATS. | Medium | Spike on each ATS API documentation during Phase 3 planning |
| IA-04 | **Public job posting URLs** (e.g., from company career pages, Indeed, LinkedIn Jobs) can be scraped for JD text using standard HTTP requests + HTML parsing. No JavaScript rendering is required for ≥80% of job posting pages. | Medium | Test against top 20 job posting sites; add Puppeteer fallback if needed |
| IA-05 | External API providers (LinkedIn, GitHub, OpenAI) will maintain **≥99.5% uptime**. Transient failures are handled with exponential backoff and retry. | Low | Implement circuit breakers per external dependency |

---

## 5. Security & Compliance Assumptions

| ID | Assumption | Risk | Validation Strategy |
|---|---|---|---|
| SA-01 | **JWT-based authentication** with short-lived access tokens (15 min) and refresh tokens (7 days) is adequate for the application. No requirement for SAML/SSO at launch. | Low | Review with enterprise customers before Phase 4 |
| SA-02 | **RBAC with three roles** (Recruiter, Hiring Manager, System Admin) covers all access patterns. No need for attribute-based access control (ABAC) at launch. | Low | Map all use cases to roles; identify gaps |
| SA-03 | **AES-256 encryption at rest** is achievable via PostgreSQL TDE or cloud-provider disk encryption. Application-level field encryption is not required for Phase 1. | Medium | Confirm with cloud provider; implement field-level encryption for PII fields if TDE is insufficient |
| SA-04 | The scoring model **does not use** name, gender, age, photo, or any protected attribute. This can be enforced by stripping these fields from the LLM prompt input. | High | Automated prompt audit: verify no protected fields are passed to scoring prompts |
| SA-05 | **GDPR right-to-delete** can be implemented as a soft delete + 30-day hard purge cycle. No candidate data persists in backups beyond 90 days. | High | Legal review; verify backup retention policies with infrastructure team |
| SA-06 | **Audit logs are append-only** and stored in a separate table/service. Immutability for 7 years is achievable via write-once cloud storage (S3 Object Lock) or dedicated audit service. | Medium | Architecture spike for audit log storage before Phase 5 |
| SA-07 | **File uploads are virus-scanned** using ClamAV or equivalent before storage. The scanning step adds ≤2 seconds per file and does not bottleneck ingestion. | Low | Benchmark ClamAV scanning speed on typical resume sizes |

---

## 6. Business & Operational Assumptions

| ID | Assumption | Risk | Validation Strategy |
|---|---|---|---|
| BA-01 | **Internal recruiting teams** are the primary users. The system is not consumer-facing; candidates interact only via the data rights portal. | Low | Confirmed in SRS stakeholder section |
| BA-02 | **50,000 resumes per tenant** is the upper bound for Phase 1–3. Tenants exceeding this will be handled via custom enterprise agreements. | Medium | Monitor tenant growth; plan sharding strategy before any tenant hits 40k |
| BA-03 | **Batch uploads of up to 500 resumes** per job are sufficient. Larger imports (e.g., database migrations from legacy ATS) will be handled via the API or bulk import scripts, not the UI. | Low | Confirm with product team |
| BA-04 | Recruiters will **manually review and correct** parsed JD fields before screening begins (FR-JD-03). The system is a recommendation engine, not a fully autonomous screener. | Low | N/A — explicit SRS requirement |
| BA-05 | The **12-month delivery timeline** (5 phases) is achievable with a team of 4–6 engineers, 1 product manager, and 1 designer. | Medium | Validate during sprint planning; flag early if team is under-resourced |
| BA-06 | **LLM API costs** are an acceptable operational expense. At $0.02/resume, processing 50,000 resumes costs ~$1,000 — a fraction of recruiter salary savings. | Low | Track actual costs vs. projection monthly |

---

## 7. User & UX Assumptions

| ID | Assumption | Risk | Validation Strategy |
|---|---|---|---|
| UA-01 | Recruiters are **comfortable with web-based tools** and do not require a desktop application or mobile app at launch. | Low | User research during Phase 1 |
| UA-02 | A **score range of 0–100** is intuitive for recruiters. No need for letter grades (A/B/C) or pass/fail labels, though the UI may add color-coded tiers for scannability. | Low | Usability testing during Phase 1 |
| UA-03 | **Weight sliders** (FR-JD-04) are an effective UI pattern for adjusting scoring dimensions. Recruiters can understand the impact of weight changes on the shortlist. | Medium | Usability testing; add live preview of rank changes |
| UA-04 | Recruiters are willing to **review and correct** LLM-parsed JD fields before screening. The review step does not create unacceptable friction. | Medium | Track time-to-review in analytics; if >5 min average, simplify the review UI |
| UA-05 | The **data rights portal** for candidates (opt-out, deletion) can be a simple, standalone page that does not require full account creation. Email verification is sufficient for identity. | Low | Legal review of identity verification requirements |
| UA-06 | **Dashboard load time of ≤2 seconds** (p95) is achievable with client-side pagination, lazy loading, and server-side score pre-computation. | Medium | Performance test with 500-candidate shortlists |

---

## 8. Infrastructure & Deployment Assumptions

| ID | Assumption | Risk | Validation Strategy |
|---|---|---|---|
| IA-D01 | **Single-region deployment** is acceptable for Phase 1–3. Active-active two-region deployment is a Phase 5 requirement. | Low | N/A — per SRS roadmap |
| IA-D02 | **Docker Compose** is sufficient for local development and staging. Kubernetes or ECS is used for production. | Low | N/A — standard practice |
| IA-D03 | **Horizontal auto-scaling** for scoring workers can be achieved by scaling BullMQ worker containers based on queue depth. No custom autoscaler is needed; cloud-native scaling (ECS/K8s HPA) is sufficient. | Medium | Load test autoscaling behavior at 2× projected volume |
| IA-D04 | **99.5% monthly uptime** is achievable with a single-region deployment using managed database (RDS), managed Redis (ElastiCache), and container orchestration (ECS/EKS). | Medium | Calculate error budgets; set up uptime monitoring from day 1 |
| IA-D05 | **CI/CD pipeline** (GitHub Actions or similar) can achieve ≤15 minute build-test-deploy cycle for the monorepo. | Low | Set up CI in Phase 1, sprint 1 |
| IA-D06 | **Local development** on macOS, Linux, and Windows (via WSL2 or Docker Desktop) is supported without platform-specific code. | Low | Test on all three platforms during onboarding |

---

## 9. Assumption Validation Tracker

Track assumption validation status here. Update as assumptions are confirmed or invalidated.

| ID | Status | Date Validated | Notes |
|---|---|---|---|
| TA-01 | 🔲 Pending | — | — |
| TA-02 | 🔲 Pending | — | — |
| LA-01 | 🔲 Pending | — | Critical — validate in Sprint 1 |
| LA-02 | 🔲 Pending | — | Critical — validate in Sprint 2 |
| IA-01 | 🔲 Pending | — | Critical — validate before Phase 2 |
| SA-04 | 🔲 Pending | — | Critical — validate in Sprint 1 |
| SA-05 | 🔲 Pending | — | Critical — legal review needed |

> **Legend:** 🔲 Pending · ✅ Validated · ❌ Invalidated · ⚠️ Partially Validated

---

## Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-30 | Product Team | Initial version created |
