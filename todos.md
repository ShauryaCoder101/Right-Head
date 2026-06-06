# ✅ TODO Tracker — RecruitIQ (RAIS)

> **Last Updated:** 2026-05-30  
> **Legend:** `[ ]` Not started · `[/]` In progress · `[x]` Completed · `[!]` Blocked  
> **Priority:** 🔴 Critical · 🟡 Important · 🟢 Nice-to-have

---

## Phase 1 — Core Screening MVP (Month 1–3)

### Sprint 1: Project Setup & Infrastructure (Week 1–2)

- [ ] 🔴 Initialize monorepo with client (Vite + React) and server (Express + TypeScript)
- [ ] 🔴 Set up PostgreSQL database and Prisma ORM
- [ ] 🔴 Define Prisma schema: `Candidate`, `JobDescription`, `ScoreRecord`, `BatchJob`, `User`, `AuditLog`
- [ ] 🔴 Run initial Prisma migration
- [ ] 🔴 Set up Redis and BullMQ for job queue
- [ ] 🔴 Configure Docker Compose for local dev (PostgreSQL, Redis, server, client)
- [ ] 🔴 Set up environment variable management (.env, validation with zod/joi)
- [ ] 🔴 Set up ESLint, Prettier, Husky pre-commit hooks
- [ ] 🟡 Set up CI/CD pipeline (GitHub Actions: lint, test, build)
- [ ] 🟡 Create `.env.example` with all required variables documented
- [ ] 🟡 Set up logging framework (pino or winston) with structured JSON logs
- [ ] 🟢 Set up error tracking (Sentry or similar)

### Sprint 2: Authentication & User Management (Week 3–4)

- [ ] 🔴 Implement JWT authentication (login, register, refresh tokens)
- [ ] 🔴 Implement RBAC middleware (Recruiter, Hiring Manager, Admin roles)
- [ ] 🔴 Build login / registration pages (frontend)
- [ ] 🔴 Create protected route wrappers (frontend)
- [ ] 🟡 Implement password reset flow
- [ ] 🟡 Build user management admin panel
- [ ] 🟡 Add rate limiting to auth endpoints (express-rate-limit)
- [ ] 🟢 Add session management (active sessions list, force logout)

### Sprint 3: JD Ingestion & Parsing (Week 5–6)

- [ ] 🔴 **FR-JD-01:** Build JD upload endpoint (PDF, DOCX, TXT, URL)
- [ ] 🔴 Implement file type validation and virus scanning (ClamAV)
- [ ] 🔴 Implement PDF text extraction (pdf-parse)
- [ ] 🔴 Implement DOCX text extraction (mammoth)
- [ ] 🔴 Implement URL text extraction (axios + cheerio)
- [ ] 🔴 **FR-JD-02:** Build LLM-powered JD parser — extract: role title, required skills, preferred skills, YoE, education, location, employment type, responsibilities
- [ ] 🔴 Design and test JD parsing prompt with structured JSON output
- [ ] 🔴 **FR-JD-03:** Build JD review/correction UI — display parsed fields, allow inline editing
- [ ] 🔴 Store parsed JD to database
- [ ] 🟡 **FR-JD-04:** Build skill weight editor UI (sliders: critical / preferred / bonus)
- [ ] 🟡 **FR-JD-05:** Build JD library (searchable, filterable list of saved JDs)
- [ ] 🟡 Add JD parsing confidence scores per field
- [ ] 🟢 Support JD templates / cloning from existing JDs

### Sprint 4: Resume Ingestion & Parsing (Week 7–8)

- [ ] 🔴 **FR-RS-01:** Build resume batch upload endpoint (up to 500 files)
- [ ] 🔴 Implement multi-file upload UI with progress tracking
- [ ] 🔴 Implement file validation (type, size, virus scan)
- [ ] 🔴 Store raw files in object storage (local filesystem for dev, S3 for prod)
- [ ] 🔴 **FR-RS-02:** Build LLM-powered resume parser — extract: name, contact, education, work experience, skills, certifications, projects, publications
- [ ] 🔴 Design and test resume parsing prompt with structured JSON output and source citations
- [ ] 🔴 **FR-RS-03:** Implement format detection — reject graphic-heavy/scanned resumes with clear error
- [ ] 🔴 **FR-RS-04:** Store parsed candidate profiles with unique candidate IDs
- [ ] 🔴 Queue resume parsing as async jobs via BullMQ
- [ ] 🔴 Build parsing progress UI (show completed/failed/pending per batch)
- [ ] 🟡 **FR-RS-05:** Implement duplicate detection (same email or name+phone match)
- [ ] 🟡 **FR-RS-06:** Build API endpoint for ATS resume upload
- [ ] 🟡 Add parsed field review UI (recruiter can correct parsed data)
- [ ] 🟢 Support drag-and-drop file upload

### Sprint 5: Scoring Engine (Week 9–10)

- [ ] 🔴 **FR-SC-01:** Build scoring engine — composite score (0–100) with dimension breakdown
- [ ] 🔴 Implement skills matching dimension (keyword + semantic via LLM)
- [ ] 🔴 Implement experience relevance dimension (YoE, industry, seniority, title)
- [ ] 🔴 Implement education & credentials dimension (degree, field, certifications)
- [ ] 🔴 Implement profile signals dimension (stub for Phase 2 enrichment data)
- [ ] 🔴 Design scoring prompt — output structured JSON with dimension scores
- [ ] 🔴 **FR-SC-02:** Generate explanation cards per candidate (plain-English summary via LLM)
- [ ] 🔴 Implement tiered LLM strategy (fast model for scoring, full model for explanations)
- [ ] 🔴 Persist score vectors to database (enable re-ranking without re-scoring)
- [ ] 🔴 Queue batch scoring as async jobs via BullMQ
- [ ] 🟡 **FR-SC-04:** Implement minimum threshold score filter
- [ ] 🟡 **FR-SC-05:** Flag candidates with conflicting data (stub for Phase 2)
- [ ] 🟡 Add scoring progress tracking (in-app notifications)

### Sprint 6: Dashboard & Shortlist UI (Week 11–12)

- [ ] 🔴 **FR-SC-03:** Build ranked shortlist view — sortable by score, dimension, custom filters
- [ ] 🔴 Build candidate card component (score, explanation, key matches/gaps)
- [ ] 🔴 Build candidate detail page (full profile, score breakdown, parsed data)
- [ ] 🔴 Build JD dashboard (list of JDs, quick stats, screening status)
- [ ] 🔴 Implement pagination and search on candidate lists
- [ ] 🔴 **FR-EX-01:** Implement CSV export of shortlist
- [ ] 🔴 Build notification system (in-app) for batch job completion
- [ ] 🟡 Build candidate comparison view (side-by-side)
- [ ] 🟡 Add keyboard navigation for shortlist (WCAG compliance)
- [ ] 🟡 Build dark mode toggle
- [ ] 🟢 Add shortlist sharing (generate shareable link for hiring manager)

### Sprint 7: Data Rights Portal & Polish (Week 13)

- [ ] 🔴 Build candidate data rights portal (standalone page)
- [ ] 🔴 Implement data deletion request flow (email verification → soft delete → 30-day purge)
- [ ] 🔴 Implement data access request (candidate can view stored data)
- [ ] 🔴 Add audit logging for all recruiter actions (view, shortlist, reject, export)
- [ ] 🔴 End-to-end testing of core flow: JD upload → resume upload → parse → score → shortlist → export
- [ ] 🟡 Performance optimization (dashboard load <2s p95)
- [ ] 🟡 Error handling audit — ensure all error states have user-friendly messages
- [ ] 🟡 Write unit tests for scoring engine
- [ ] 🟡 Write API integration tests
- [ ] 🟢 Write user documentation / help pages

---

## Phase 2 — Profile Enrichment (Month 4–5)

### Sprint 8–9: LinkedIn & GitHub Integration (Week 14–17)

- [ ] 🔴 **FR-PE-01:** Build profile link input (LinkedIn, GitHub, portfolio URLs)
- [ ] 🔴 **FR-PE-02:** Implement LinkedIn OAuth flow (candidate consent)
- [ ] 🔴 Extract LinkedIn data: current role, endorsements, recommendations, activity recency
- [ ] 🔴 **FR-PE-05:** Implement opt-in/opt-out enrichment per candidate and per recruiter
- [ ] 🟡 **FR-PE-03:** Implement GitHub API integration (repos, languages, contributions, stars)
- [ ] 🟡 **FR-PE-04:** Merge enriched data with parsed resume; detect and flag discrepancies (tenure mismatch >6mo)
- [ ] 🟡 **FR-PE-06:** Implement 30-day enrichment cache with manual re-fetch
- [ ] 🟡 Update scoring engine to incorporate profile signals dimension with real data
- [ ] 🟡 Show enrichment status and data on candidate detail page
- [ ] 🟡 Display score delta after enrichment (before/after comparison)
- [ ] 🟢 Build enrichment queue with rate-limit-aware scheduling

### Sprint 10: Conflict Detection & Re-Scoring (Week 18–19)

- [ ] 🔴 **FR-SC-05:** Implement conflict detection (resume vs. enriched data)
- [ ] 🔴 Build conflict review UI (side-by-side comparison, recruiter resolution)
- [ ] 🟡 Auto re-score after enrichment data is merged
- [ ] 🟡 Add "enrichment pending" status indicators on shortlist
- [ ] 🟢 Build public URL / portfolio scraper for additional data

---

## Phase 3 — Retroactive Re-Screening (Month 6–7)

### Sprint 11–12: Re-Screening Engine (Week 20–23)

- [ ] 🔴 **FR-RR-01:** Build re-screening workflow — score entire historical pool against new JD
- [ ] 🔴 **FR-RR-02:** Implement async re-screening for pools >100 candidates
- [ ] 🔴 Build re-screening trigger UI (select JD → select pool → optional filters → run)
- [ ] 🔴 Implement in-app + email notifications on re-screening completion
- [ ] 🔴 **FR-RR-03:** Implement full scoring history per candidate (all JDs, timestamps, snapshots)
- [ ] 🟡 **FR-RR-04:** Build pool filter UI (date range, source batch, tags)
- [ ] 🟡 Build scoring history timeline on candidate detail page
- [ ] 🟡 Implement progress tracking for large re-screening jobs
- [ ] 🟢 **FR-RR-05:** "Hidden Gems" detection — flag candidates who score significantly higher on new JD

---

## Phase 4 — ATS Integration & Analytics (Month 8–10)

### Sprint 13–15: REST API & ATS Connectors (Week 24–29)

- [ ] 🔴 Build REST API v1 with OpenAPI 3.1 spec
- [ ] 🔴 Implement OAuth2 authentication for API consumers
- [ ] 🔴 Implement API rate limiting and versioning
- [ ] 🔴 Publish interactive API documentation (Swagger UI at /api/v1/docs)
- [ ] 🟡 Build Greenhouse integration (push candidates, pull JDs)
- [ ] 🟡 Build Lever integration
- [ ] 🟡 Build Workday integration
- [ ] 🟡 Implement webhook support for status events (scoring complete, candidate updated)
- [ ] 🟢 Build Python SDK
- [ ] 🟢 Build Node.js SDK

### Sprint 16–17: Advanced Features (Week 30–33)

- [ ] 🟡 **FR-JD-04:** Build custom weight profiles (saveable, reusable across JDs)
- [ ] 🟡 **FR-EX-02:** Generate per-candidate one-page PDF summary
- [ ] 🟡 **FR-EX-01:** ATS-compatible export formats (Greenhouse, Lever, Workday)
- [ ] 🟢 **FR-EX-03:** Diversity analytics dashboard (aggregated, anonymised)
- [ ] 🟢 Build recruiter analytics (time-to-shortlist, screening volume, score distributions)

---

## Phase 5 — Compliance & Hardening (Month 11–12)

### Sprint 18–20: Security, Compliance & Performance (Week 34–40)

- [ ] 🔴 SOC 2 Type II audit preparation
- [ ] 🔴 Third-party bias audit against EEOC categories
- [ ] 🔴 WCAG 2.1 AA accessibility audit and remediation
- [ ] 🔴 Implement multi-region active-active deployment
- [ ] 🔴 Implement immutable audit log storage (7-year retention)
- [ ] 🟡 Implement field-level encryption for PII
- [ ] 🟡 Penetration testing
- [ ] 🟡 Load testing at 2× projected scale
- [ ] 🟡 Implement automated backup and disaster recovery
- [ ] 🟡 Implement tenant-level usage quotas and metering
- [ ] 🟢 Implement SSO (SAML) for enterprise customers
- [ ] 🟢 Implement IP allowlisting for API access

---

## Cross-Cutting Tasks (Ongoing)

- [ ] 🔴 Write and maintain API documentation
- [ ] 🔴 Write unit tests (target: ≥80% coverage for services)
- [ ] 🔴 Write integration tests for all API endpoints
- [ ] 🟡 Write E2E tests (Playwright) for critical user flows
- [ ] 🟡 Set up monitoring and alerting (uptime, error rates, latency)
- [ ] 🟡 Set up cost monitoring for LLM API usage
- [ ] 🟡 Monthly bias metric reporting
- [ ] 🟢 Create onboarding guide for new developers
- [ ] 🟢 Create user documentation / help center

---

## Bug Tracker

> Bugs discovered during development. Move resolved bugs to a separate section.

| ID | Description | Severity | Status | Sprint |
|---|---|---|---|---|
| — | No bugs logged yet | — | — | — |

---

## Decisions Log

> Track key technical decisions and their rationale.

| Date | Decision | Rationale | Decided By |
|---|---|---|---|
| 2026-05-30 | Use monorepo (client + server) | Simplifies CI/CD and dependency management for small team | Product Team |
| 2026-05-30 | PostgreSQL with JSONB over MongoDB | Better ACID compliance, mature ecosystem, JSONB covers semi-structured needs | Product Team |
| 2026-05-30 | Tiered LLM strategy (fast + full) | Cost optimization: ~90% of LLM calls use cheap model | Product Team |
| 2026-05-30 | BullMQ over SQS for Phase 1 | Simpler local dev setup; can migrate to SQS in Phase 4 if needed | Product Team |
| 2026-05-30 | No OCR / vision-LLM | Explicit SRS constraint (FR-RS-03); reduces complexity and cost | Product Team |
