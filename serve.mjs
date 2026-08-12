// Prod-like local/CI server: serves the built SPA (dist/) AND the same API
// handlers Vercel runs in prod, from one process. This is what `npm run start`
// launches, so e2e tests hit a production build (not a dev server) - matching
// the diagrams app's testing philosophy. One source of truth: the handlers in
// lib/handlers are the exact code the Vercel functions in api/ import.
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import createSystemDesign from "./lib/handlers/create-system-design.js";
import generate from "./lib/handlers/generate.js";
import health from "./lib/handlers/health.js";
import systemDesignById from "./lib/handlers/system-design-by-id.js";
import { withErrors } from "./lib/wrap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Mirror the prod security headers (vercel.json) so local == prod, including the
// strict CSP with NO 'unsafe-eval'. Catches CSP regressions before they ship.
app.use((_req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  );
  next();
});

app.post("/api/ai/system-designs", withErrors(createSystemDesign));
app.post("/api/ai/generate", withErrors(generate));
app.get("/api/health", withErrors(health));
app.all("/api/system-designs/:id", withErrors(systemDesignById));

// Static SPA + client-side routing fallback.
const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));

const PORT = process.env.PORT || 4321;
app.listen(PORT, () => console.log(`system-design server on http://localhost:${PORT}`));
