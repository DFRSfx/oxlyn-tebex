import dotenv from 'dotenv';

/**
 * Environment loader.
 *
 * Loads `.env.local` FIRST (local-only overrides — gitignored, used for
 * `npm run dev` against a local DB/client) and then the regular `.env`
 * (production values). dotenv never overwrites a variable that is already
 * set, so anything declared in `.env.local` wins over `.env` — and over every
 * other `dotenv.config()` call across the codebase, because this module is
 * imported before any of them run.
 *
 * SAFETY: the `.env.local` override is applied ONLY when we are NOT already in
 * production. So even if `.env.local` accidentally lands on the VPS, a server
 * launched with NODE_ENV=production (pm2/systemd/Docker) ignores it and uses
 * the production `.env`. Locally NODE_ENV isn't pre-set, so the override loads
 * normally (and itself sets NODE_ENV=development).
 *
 * Deploying to the VPS just means NOT shipping `.env.local`; the untouched
 * production `.env` then applies as-is.
 */
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();
