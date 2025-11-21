# Repository Guidelines

## Project Structure & Module Organization
- The Next.js 16 app routes live in `app/` (server components by default) with shared UI in `components/` and cross-cutting hooks/providers in `contexts/`.
- Business logic, API helpers, and Walrus/Sui adapters belong in `lib/`; keep data definitions near their client modules.
- Persistent assets stay in `public/`; Prisma schema and migrations sit under `prisma/` while maintenance utilities live in `scripts/`.
- Vitest suites reside in `tests/` (`tests/crypto`, `tests/integration`); co-located `*.test.ts` files are fine for component-specific cases.

## Build, Test, and Development Commands
- `npm run dev` — launches the default Next dev server on port 3000; use `dev1`–`dev3` when you need parallel stacks on 3051–3053.
- `npm run build` — creates the production bundle (Next + React 19 server/client artifacts).
- `npm run start` — serves the last build; use this when validating deployment artifacts.
- `npm run lint` — runs the shared `eslint.config.mjs`.
- `npm run test`, `npm run test:watch`, `npm run test:coverage` — Vitest in batch, watch, and coverage modes; niche suites (`test:crypto`, `test:integration`) stay green before merging.
- Utility CLIs: `npm run clear-db` resets Prisma tables, `npm run get-blob-ids` audits Walrus blobs.

## Coding Style & Naming Conventions
- TypeScript everywhere; adhere to the strict options in `tsconfig.json` and prefer explicit return types on hooks/utilities.
- React components use PascalCase filenames (e.g., `VideoPlayer.tsx`), hooks/helpers stay camelCase, route segments stay lowercase.
- Keep layout logic declarative; defer heavy client logic to `lib/` or dedicated server actions.
- Run `npm run lint` before opening PRs; fix warnings rather than suppressing unless justified.

## Testing Guidelines
- Write unit tests with Vitest + Happy DOM; name files `*.test.ts` or `*.test.tsx`.
- Crypto/Sui flows belong in `tests/crypto`, network/pipeline specs in `tests/integration`.
- Target meaningful coverage (`npm run test:coverage`); mock Walrus/Sui calls and gate any external RPC hits behind feature flags.
- When adding Prisma models, include a regression test that seeds via an in-memory sqlite or fixture.

## Commit & Pull Request Guidelines
- Follow the existing concise, imperative style (`Fix cost estimation API`, `Implement network detection`); keep < 72 char subjects, optional details in the body.
- Each PR should describe scope, risks, and test evidence (`npm run test`, screenshots for UI deltas) and link to the relevant GitHub issue or Walrus task.
- Highlight schema changes (Prisma migrations, SQL scripts) and note any required env var updates; reviewers need to know if `prisma migrate` or `check-db.mjs` must run post-merge.

## Security & Configuration Tips
- Never commit `.env*` or Prisma-generated secrets; document required keys (Sui RPC, Walrus API) inside `PROJECT.md` instead.
- Use `check-db.mjs` locally after schema edits to verify migrations, and prefer mock keys for automated tests.
- Keep uploaded media in Walrus, not `public/`; sanitize any user-supplied filenames before persisting.
