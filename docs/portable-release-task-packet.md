# Portable release task packet

## Outcome

Produce a Windows x64 ZIP smaller than 100 MiB that starts the AI Mock application after extraction without requiring Node.js or PostgreSQL to be preinstalled.

## Relevant context

- Application build: Next.js standalone output in `.next/standalone`.
- Runtime: Node.js 24 x64 and PostgreSQL 17 x64.
- Core journey: sign in with the seeded demo user, upload a PDF/DOCX resume, generate up to 10 CV questions, answer, score, and view the report.
- The source environment uses a local PostgreSQL database and an optional DashScope model provider.

## Constraints

- Must target Windows 10/11 x64.
- Must keep the compressed archive below 100 MiB.
- Must not include `.env.local`, API keys, existing resumes, user records, sessions, cookies, or production data.
- Must include a fresh migrated and seeded database only.
- Must run without Redis, Langfuse, remote embeddings, or a remote model by using the deterministic local fallback.
- Must provide an optional local configuration file for a tester to add their own model key.
- Must not modify the developer's existing PostgreSQL cluster.

## Acceptance

1. `AI-Mock-Portable-Windows-x64.zip` is smaller than 104,857,600 bytes.
2. The extracted package contains its own `node.exe`, PostgreSQL server runtime, initialized database, Next.js standalone application, and one-click launcher.
3. No secret value or existing user CV is present in the package.
4. Starting from a separate extraction directory brings up PostgreSQL and the web server and returns HTTP 200 from `/`.
5. The seeded demo login remains available and the knowledge API returns HTTP 200.
6. Stopping the package shuts down both bundled processes without touching the developer database.

## Risks

- PostgreSQL and Prisma native binaries are platform-specific; this artifact is Windows x64 only.
- Removing runtime files solely to meet the size limit can cause delayed route failures; smoke tests must cover resume parsing and database-backed APIs.
- External model generation is disabled until the tester supplies a key, so the default package uses local deterministic scoring and question fallback.

## Return contract

- Report the archive path and exact byte size.
- List included and excluded capabilities.
- Record smoke-test results and any unresolved portability limitations.

## Verification evidence — 2026-08-18

- Final archive: `AI-Mock-Portable-Windows-x64-20260818-r4.zip`.
- Size: 99,843,901 bytes / 95.22 MiB; under the 100 MiB gate.
- SHA-256: `FFF6E412425EB794FB71C2D3D355EF94794E5C53334C968FCA6B003080F56BE8`.
- Independent extraction smoke test:
  - homepage `200`;
  - AI-product knowledge API `200`;
  - seeded demo login `200`;
  - PDF resume upload `201`;
  - CV-related mock creation `201` with 10 questions;
  - answer submission `200`, answer and score persisted, next question advanced, Run Trace created;
  - bundled PostgreSQL stopped cleanly through the package stop script.
- First launch generated a per-extraction JWT secret in `run/auth-jwt-secret.txt`; the secret is not stored in the ZIP.
- Exact-value scan found no copy of the developer `DATABASE_URL` or `AI_API_KEY` in 4,658 packaged files.
- Archive listing found no `.env.local`, model-key override, cookies, test responses, uploaded resume, or generated auth secret.
- Gitleaks reported four generic high-entropy candidates inside compiled Next.js manifests/chunks. Exact-value comparison found no developer secret match; these remain recorded as generated-bundle false-positive candidates rather than a clean Gitleaks gate.
- Repository regression: 53 passed / 4 skipped / 0 failed; TypeScript and ESLint passed.
- `npm audit --omit=dev` reports six high findings in the full developer dependency tree. The portable runtime excludes the flagged Prisma CLI/config, Sharp, and PostCSS packages; dependency upgrade remains a separate compatibility task and this package is limited to local-device testing.
