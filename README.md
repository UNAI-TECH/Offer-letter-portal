# UNAI TECH – Virtual Internship Offer Letter Generation Portal

Official production repository for **UNAI TECH Pvt. Ltd.** Virtual Internship Program Offer Letter Generation Portal.

This system validates participant registration against imported authoritative domain workbooks, verifies identity with case-insensitive normalization and cryptographically hashed sessions, verifies domain eligibility before issuance, and generates personalized official offer letters using pixel-perfect PDF template overlay.

---

## 🏛️ Project Architecture & Technology Stack

- **Frontend:**
  - React 19, Vite, TypeScript
  - Tailwind CSS (Brand colors `#4a279b`, `#2e02ae`, `#383535`)
  - Lucide React Icons & Framer Motion
  - Embedded `pdf-lib` overlay engine
- **Backend & Database:**
  - Supabase PostgreSQL (8 tables, strict constraints, foreign keys, triggers)
  - Supabase Edge Functions (Deno runtime, Web Crypto API, `pdf-lib`, `sheetjs`)
  - Supabase Private Storage (`offer-letter-templates`, `generated-offer-letters`, `participant-imports`)
  - Supabase Row Level Security (RLS) on all tables & buckets
- **Deployment Targets:**
  - Frontend: Vercel / Netlify
  - Backend: Supabase Cloud

---

## 📁 Repository Structure

```text
unai-offer-letter-portal/
├── public/
│   ├── logo.png                       # Official UNAI TECH company logo
│   └── favicon.ico                    # High-res favicon
├── source-files/                      # STRICTLY CONFIDENTIAL (Ignored by Git)
│   ├── Marks UNAI TECH... FULL STACK...xlsx
│   ├── Marks UNAI TECH... AI & AUTOMATION...xlsx
│   ├── Marks UNAI TECH... APP DEVELOPMENT...xlsx
│   ├── Marks UNAI TECH... WEB DEVELOPMENT...xlsx
│   └── ammu.pdf (3).pdf               # Official UNAI TECH Offer Letter Template
├── frontend/                          # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/                # Step 1, Step 2, Step 3, Admin Dashboard
│   │   ├── data/                      # Official participants dataset & encoded template
│   │   ├── services/                  # API client & PDF overlay engine
│   │   └── types.ts                   # Strongly typed contracts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── supabase/                          # Supabase Cloud Architecture
│   ├── functions/                     # Privileged Edge Functions
│   │   ├── _shared/                   # CORS, Supabase Admin, Crypto, PDF Overlay
│   │   ├── verify-participant/        # Step 1: Secure Name & Email Verification
│   │   ├── generate-offer-letter/     # Step 2 & 3: Domain Authorization & PDF Generation
│   │   ├── get-offer-letter-download/ # Step 4: Signed Attachment PDF Stream
│   │   ├── import-participants/       # Admin: Idempotent XLSX Batch Importer
│   │   └── admin-portal/              # Admin: Statistics, Reissue & Revocation
│   ├── migrations/
│   │   ├── 20261105000000_initial_schema.sql      # Schema, RLS, Storage & Indexes
│   │   └── 20261105000001_seed_participants.sql   # 173 participants & 222 domain links
│   └── config.toml
├── docs/                              # Quality Assurance, Inspection & Audit Reports
│   ├── EXCEL_AND_PDF_ANALYSIS_REPORT.md
│   ├── OFFICIAL_IMPORT_REPORT.md
│   └── PHASE_8_TESTING_REPORT.md
├── test_pdf_engine.js                 # Automated PDF calibration test suite
├── test_full_suite.js                 # Complete Phase 8 QA test suite
├── .env.example
├── .gitignore
└── README.md
```

---

## 📊 Authoritative Data Import Summary

The 4 official Excel source workbooks were inspected and verified:

| Internship Domain | Domain Code | Valid Records | Duplicates | Invalid Rows |
|---|---|---|---|---|
| **FULL STACK DEVELOPMENT** | `FULL_STACK` | **72** | 0 | 0 |
| **AI & AUTOMATION** | `AI_AUTOMATION` | **82** | 0 | 0 |
| **APP DEVELOPMENT** | `APP_DEVELOPMENT` | **21** | 0 | 0 |
| **WEB DEVELOPMENT** | `WEB_DEVELOPMENT` | **47** | 0 | 0 |
| **TOTAL REGISTRATIONS** | — | **222** | **0** | **0** |

- **Total Unique Participants (Unique Emails):** `173`
- **Participants in Multiple Domains:** `27` (relational junction in `participant_domains`)
- **Conflicting Names Across Files:** `0` (100% data consistency)

---

## 🔒 Security & Verification Workflow

1. **Step 1 – Name & Email Verification (`verify-participant`):**
   - User inputs Full Name and Registered Email.
   - Server performs case-insensitive normalization and word-order matching.
   - If verified, creates an opaque 32-byte cryptographic session token.
   - Computes SHA-256 hash and stores in `verification_sessions` with 15-minute expiration.
   - **Critical:** Returns only `sessionToken`, verified name, and email. Never exposes or hints registered domains.

2. **Step 2 & 3 – Manual Selection & Domain Validation (`generate-offer-letter`):**
   - Participant enters College Name and manually selects one of the 4 domains from the dropdown.
   - Backend independently checks `verification_sessions` token hash and active expiry.
   - Backend queries `participant_domains` for the combination of `(participant_id, domain_id)`.
   - If participant is not registered for that domain, request is rejected with:
     `"Your registered email is not associated with the selected internship domain. Please select the correct domain."`
   - Checks idempotency: if an offer letter already exists for this participant and domain, the existing document is returned rather than generating duplicate records.

3. **Step 4 – Exact Template Overlay & Download:**
   - Background uses the original `ammu.pdf (3).pdf` (595.5 pt x 842.25 pt).
   - MediaBox offset (`7.83 pt`) calibrated for 0.00 pt baseline precision.
   - Dynamically replaces:
     - `{participant name}` -> Verified participant name (Times-Bold 12pt).
     - `{date}` -> `01 November 2026` (Right aligned, Times-Bold 12pt).
     - `{College Name}` -> Entered college name (Times-Roman 12pt, dynamic scaling for long names).
     - `{domain}` in Subject -> Selected domain name (Times-Bold 12pt).
     - `{domain}` in Internship Details -> Selected domain name (Times-Roman 12pt).
   - Generates unique reference ID: `UNAI-2026-<DOMAIN>-<HEX>`.
   - Direct attachment download triggered with filename: `UNAI_TECH_Offer_Letter_<Participant_Name>.pdf`.
   - No auto-print, no print dialog, no print buttons, no external email sharing.

---

## 🚀 Deployment Instructions

### 1. Supabase Cloud Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run database migrations:
   ```bash
   cd unai-offer-letter-portal
   supabase db push
   # Or execute the SQL files in Supabase SQL Editor:
   # 1) supabase/migrations/20261105000000_initial_schema.sql
   # 2) supabase/migrations/20261105000001_seed_participants.sql
   ```
3. Upload the original template `ammu.pdf (3).pdf` into the private storage bucket `offer-letter-templates` with the name `ammu.pdf`.
4. Deploy the Supabase Edge Functions:
   ```bash
   supabase functions deploy verify-participant
   supabase functions deploy generate-offer-letter
   supabase functions deploy get-offer-letter-download
   supabase functions deploy import-participants
   supabase functions deploy admin-portal
   ```

### 2. Frontend Deployment (Vercel or Netlify)

1. Set the environment variables in your Vercel or Netlify dashboard:
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   VITE_SUPABASE_FUNCTIONS_URL=https://<your-project-id>.supabase.co/functions/v1
   ```
2. Build command:
   ```bash
   cd frontend
   pnpm install
   pnpm build
   ```
3. Output directory: `frontend/dist`

---

## 🧪 Local Testing & Verification

Run the automated test suites from the project root:

```bash
cd unai-offer-letter-portal

# Run Phase 8 Quality Assurance Suite (15 automated tests)
node test_full_suite.js

# Run PDF Engine Calibration & Edge-Cases Test
node test_pdf_engine.js

# Build frontend production bundle
cd frontend
pnpm build
pnpm preview
```

### Admin Access
Access the Administrator Management Console via the top-right button in the header. Default administrative passkey: `unai@admin2026`.

---

© 2026 UNAI TECH Pvt. Ltd. All Rights Reserved.

# Offer-letter-portal
