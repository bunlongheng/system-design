// Fail-fast validation of the env vars the API needs in production. Imported by
// vite.config.js so a misconfigured PRODUCTION build throws and FAILS the Vercel
// deploy instead of silently shipping a dead API. Mirrors diagrams' lib/env.ts.
//
// Only enforced on real production builds (VERCEL_ENV==="production"). Local dev,
// CI, and Vercel preview deploys are intentionally lenient.

const REQUIRED_IN_PRODUCTION = ["SYSTEM_DESIGNS_API_SECRET", "DATABASE_URL", "OWNER_USER_ID"];

export function validateEnv() {
  if (process.env.VERCEL_ENV !== "production") return;

  const missing = REQUIRED_IN_PRODUCTION.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required production env var(s): ${missing.join(", ")}. ` +
        `Set them in Vercel (Production) before deploying - the artifact API will not work without these.`,
    );
  }
}

validateEnv();
