<p align="center">
  <h1 align="center">🧠 RecruitIQ</h1>
  <p align="center"><strong>AI-Powered Resume Screening System</strong></p>
  <p align="center">
    Automate candidate evaluation · Rank with explainability · Re-screen historical pools
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0--alpha-blue" alt="version" />
  <img src="https://img.shields.io/badge/license-Proprietary-red" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-green" alt="node" />
  <img src="https://img.shields.io/badge/status-In%20Development-orange" alt="status" />
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Scoring Model](#scoring-model)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Overview

**RecruitIQ (RAIS)** is an AI-powered resume screening system that automates the evaluation of candidate profiles against job descriptions. It addresses the full screening lifecycle:

1. **Parse** resumes and public profiles into structured data
2. **Match** candidates against job descriptions with weighted, multi-dimensional scoring
3. **Re-screen** historical resumes when a new JD is uploaded — turning your candidate database into a living, queryable asset
4. **Explain** every score with plain-English candidate cards

RAIS eliminates manual first-pass screening, reduces time-to-shortlist, and ensures consistency across reviewers.

---

## Key Features

| Feature | Description |
|---|---|
| 📄 **Multi-format Ingestion** | Accept JDs and resumes as PDF, DOCX, TXT, or pasted URL |
| 🤖 **LLM-Powered Parsing** | Extract structured fields (skills, experience, education) from unstructured text |
| 🔗 **Profile Enrichment** | Augment candidate data from LinkedIn (OAuth), GitHub API, and public URLs |
| 📊 **Weighted Scoring** | Composite 0–100 score across skills, experience, education, and profile signals |
| 💬 **Explanation Cards** | Plain-English summary of why each candidate scored as they did |
| 🔄 **Retroactive Re-Screening** | Score entire historical candidate pools against new JDs without re-upload |
| 💎 **Hidden Gems** | Surface candidates who scored low on past JDs but match new ones well |
| 📤 **Export & Integration** | CSV, PDF reports, and REST API for ATS integrations (Greenhouse, Lever, Workday) |
| 🛡️ **Compliance** | GDPR/CCPA compliant, bias-mitigated scoring, full audit trail |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                         │
│   Dashboard · Shortlist · Weight Editor · Candidate Portal      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────┐
│                     API Gateway (Express)                       │
│          OAuth2 · Rate Limiting · Versioned Routes              │
└───┬──────────┬──────────┬──────────┬──────────┬────────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌────────┐┌────────┐┌─────────┐┌────────┐┌──────────┐
│Ingest  ││Parser  ││Enrichmt ││Scoring ││ Export   │
│Service ││Service ││Service  ││Engine  ││ Service  │
└───┬────┘└───┬────┘└────┬────┘└───┬────┘└────┬─────┘
    │         │          │         │           │
    ▼         ▼          ▼         ▼           ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL (Prisma ORM)                 │
│   Candidates · JDs · Scores · BatchJobs · AuditLog  │
└─────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
    ┌────┴─────┐                  ┌─────┴──────┐
    │  Redis   │                  │   Object   │
    │ (BullMQ) │                  │  Storage   │
    │  Queues  │                  │ (S3/Local) │
    └──────────┘                  └────────────┘
```

### Core Services

| Service | Responsibility |
|---|---|
| **Ingestion Service** | File upload validation, virus scanning, storage to object store |
| **Parser Service** | LLM-powered extraction of structured JSON from resume/JD text |
| **Enrichment Service** | LinkedIn OAuth, GitHub API, public URL scraping, data merge |
| **Scoring Engine** | Weighted multi-dimensional scoring with tiered LLM strategy |
| **Export Service** | CSV, PDF generation, ATS-format export |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, React Router, Zustand (state), Recharts |
| **Backend** | Node.js 20+, Express.js, TypeScript |
| **Database** | PostgreSQL 16 with JSONB columns |
| **ORM** | Prisma |
| **Job Queue** | BullMQ + Redis |
| **LLM Provider** | OpenAI API (GPT-4o-mini for scoring, GPT-4o for explanations) |
| **File Parsing** | pdf-parse (PDF), mammoth (DOCX), cheerio (HTML/URL) |
| **Auth** | JWT + bcrypt, OAuth2 for API consumers |
| **Storage** | Local filesystem (dev), AWS S3 (prod) |
| **Testing** | Vitest (unit), Supertest (API), Playwright (E2E) |
| **Containerization** | Docker + Docker Compose |

---

## Project Structure

```
recruitiq/
├── client/                     # React SPA (Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/             # Static assets, fonts, images
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/         # Buttons, inputs, modals, etc.
│   │   │   ├── dashboard/      # Dashboard-specific components
│   │   │   ├── candidates/     # Candidate cards, lists
│   │   │   ├── scoring/        # Score displays, weight sliders
│   │   │   └── export/         # Export dialogs
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Route-level page components
│   │   ├── services/           # API client functions
│   │   ├── store/              # Zustand state stores
│   │   ├── utils/              # Helpers and formatters
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
│
├── server/                     # Express API server
│   ├── src/
│   │   ├── config/             # App config, env validation
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/         # Auth, rate-limit, error handling
│   │   ├── models/             # Prisma schema & migrations
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # Business logic layer
│   │   │   ├── ingestion/      # File upload, validation
│   │   │   ├── parser/         # LLM-powered resume/JD parsing
│   │   │   ├── enrichment/     # LinkedIn, GitHub, URL enrichment
│   │   │   ├── scoring/        # Match scoring engine
│   │   │   └── export/         # Report generation
│   │   ├── jobs/               # BullMQ job processors
│   │   ├── utils/              # Shared utilities
│   │   └── app.js              # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Migration files
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── fixtures/
│
├── docs/                       # Documentation
│   ├── api/                    # OpenAPI specs
│   ├── architecture/           # Architecture Decision Records
│   └── guides/                 # User & developer guides
│
├── scripts/                    # Build, deploy, seed scripts
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── assumptions.md
├── todos.md
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **PostgreSQL** ≥ 16
- **Redis** ≥ 7
- **Docker & Docker Compose** (recommended)
- **OpenAI API Key** (or compatible LLM provider)

### Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/recruitiq.git
cd recruitiq

# 2. Copy environment file
cp .env.example .env
# Edit .env with your API keys and database credentials

# 3. Start all services
docker-compose up -d

# 4. Run database migrations
docker-compose exec server npx prisma migrate deploy

# 5. Seed demo data (optional)
docker-compose exec server npm run seed

# 6. Open the app
# Frontend: http://localhost:5173
# API:      http://localhost:3000/api/v1
```

### Local Development (without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL and Redis (ensure they are running)

# 3. Configure environment
cp .env.example .env

# 4. Run migrations
cd server && npx prisma migrate dev

# 5. Start backend
npm run dev:server

# 6. Start frontend (new terminal)
npm run dev:client
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/recruitiq` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `OPENAI_API_KEY` | OpenAI API key for LLM parsing/scoring | — |
| `JWT_SECRET` | Secret for JWT token signing | — |
| `S3_BUCKET` | Object storage bucket (prod) | `recruitiq-uploads` |
| `S3_REGION` | AWS region for S3 | `us-east-1` |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth app client ID | — |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth app secret | — |
| `GITHUB_TOKEN` | GitHub personal access token (public API) | — |
| `MAX_UPLOAD_SIZE_MB` | Maximum file upload size | `25` |
| `BATCH_CONCURRENCY` | Concurrent scoring workers | `10` |
| `SCORE_CACHE_TTL_DAYS` | Days to cache enrichment data | `30` |
| `NODE_ENV` | Environment mode | `development` |

---

## API Documentation

The REST API follows OpenAPI 3.1 spec. Full documentation is available at `/api/v1/docs` when the server is running.

### Key Endpoints

```
POST   /api/v1/jd                    # Upload/create a job description
GET    /api/v1/jd/:id                # Get parsed JD
PUT    /api/v1/jd/:id/weights        # Update scoring weights

POST   /api/v1/candidates/upload     # Batch upload resumes
GET    /api/v1/candidates            # List candidates (paginated)
GET    /api/v1/candidates/:id        # Get candidate profile + scores

POST   /api/v1/scoring/run           # Trigger scoring for JD + candidates
GET    /api/v1/scoring/results/:jdId # Get ranked shortlist
POST   /api/v1/scoring/rescreen      # Re-screen historical pool

POST   /api/v1/enrichment/:id        # Trigger profile enrichment

GET    /api/v1/export/csv/:jdId      # Export shortlist as CSV
GET    /api/v1/export/pdf/:jdId      # Export shortlist as PDF report

POST   /api/v1/auth/login            # Authenticate
POST   /api/v1/auth/register         # Register new user

DELETE /api/v1/candidates/:id/data   # GDPR data deletion request
```

---

## Scoring Model

Each candidate receives a composite score (0–100) computed as a weighted sum of four dimensions:

| Dimension | Default Weight | Signals |
|---|---|---|
| **Skills Match** | 40% | Exact keyword match, semantic similarity, critical skill gap penalty |
| **Experience Relevance** | 30% | Years of experience, industry alignment, seniority, title overlap |
| **Education & Credentials** | 15% | Degree level, field alignment, certifications |
| **Profile Signals** | 15% | LinkedIn activity, recommendations, GitHub contributions |

Recruiters can adjust weights per JD via the UI weight editor. Score vectors are persisted so re-ranking on weight changes does not require re-scoring.

### Tiered LLM Strategy

- **Fast model** (GPT-4o-mini / Claude Haiku): Used for parsing and scoring — high throughput, low cost
- **Full model** (GPT-4o / Claude Sonnet): Used only for generating explanation cards — higher quality reasoning

---

## Deployment

### Production (Docker)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Targets

| Environment | Purpose | Infrastructure |
|---|---|---|
| `development` | Local dev | Docker Compose, local PostgreSQL/Redis |
| `staging` | Pre-production testing | Single-region cloud deployment |
| `production` | Live system | Active-active two-region, auto-scaling workers |

---

## Roadmap

| Phase | Timeline | Status |
|---|---|---|
| **Phase 1** — Core Screening MVP | Month 1–3 | 🔄 In Progress |
| **Phase 2** — Profile Enrichment | Month 4–5 | ⏳ Planned |
| **Phase 3** — Retroactive Re-Screening | Month 6–7 | ⏳ Planned |
| **Phase 4** — ATS Integration & Analytics | Month 8–10 | ⏳ Planned |
| **Phase 5** — Compliance & Hardening | Month 11–12 | ⏳ Planned |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code restructuring
- `test:` — Test additions/changes
- `chore:` — Tooling, CI, dependencies

---

## License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ by the RecruitIQ Product Team
</p>
