// Signed-out landing. Family style (mindmaps/diagrams/stickies): a centered card
// (logo + title + tagline + Continue with Google) over an animated motif of the
// app's own thing. Here the motif is the full AWS service-icon set: all 45 real
// AWS icons scatter across the screen, pop in on load (staggered), then float
// gently. Self-contained (icons are same-origin /icons/*, CSP-safe - no CDN
// fonts), aria-hidden decoration, respects prefers-reduced-motion.

const AWS_ICONS = [
  "apigateway.png", "aws-acm.svg", "aws-amplify.svg", "aws-appsync.svg", "aws-athena.svg",
  "aws-aurora.svg", "aws-cloudformation.svg", "aws-codebuild.svg", "aws-codedeploy.svg",
  "aws-codepipeline.svg", "aws-cognito.svg", "aws-dynamodb-streams.svg", "aws-ecr.svg",
  "aws-ecs.svg", "aws-eks.svg", "aws-elasticbeanstalk.svg", "aws-fargate.svg", "aws-glue.svg",
  "aws-iam.svg", "aws-kinesis.svg", "aws-redshift.svg", "aws-route53.svg", "aws-secrets-manager.svg",
  "aws-ses.svg", "aws-shield.svg", "aws-vpc.svg", "aws-waf.svg", "cloudfront.png", "cloudtrail.png",
  "cloudwatch.png", "dynamodb.png", "ec2.png", "elasticache.png", "elb.png", "eventbridge.png",
  "keyspaces.png", "kms.png", "lambda.png", "opensearch.png", "rds.png", "s3.png", "sagemaker.png",
  "sns.png", "sqs.png", "stepfunctions.png",
];

// Deterministic scatter across a COLS x ROWS grid, skipping the center cells so
// the card sits in clear space. One icon per cell (+ small per-cell jitter).
const COLS = 10;
const ROWS = 7;
function layout() {
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const deadX = c >= 3 && c <= 6; // center columns
      const deadY = r >= 2 && r <= 4; // center rows
      if (deadX && deadY) continue; // keep the card's zone clear
      cells.push([c, r]);
    }
  }
  return AWS_ICONS.map((icon, i) => {
    const [c, r] = cells[i % cells.length];
    const jx = ((i * 37) % 11) - 5; // deterministic +-5%
    const jy = ((i * 53) % 9) - 4;
    return {
      icon,
      left: ((c + 0.5) / COLS) * 100 + jx * 0.4,
      top: ((r + 0.5) / ROWS) * 100 + jy * 0.5,
      size: 34 + ((i * 7) % 4) * 5, // 34-49px, varied for depth
      floatDur: 4 + ((i * 3) % 5) * 0.8, // 4.0 - 7.2s
      floatDelay: ((i * 5) % 9) * 0.4,
      popDelay: 0.15 + i * 0.035,
    };
  });
}
const TILES = layout();

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function SignInScreen({ devBypass, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "radial-gradient(120% 120% at 50% 0%, #ffffff 0%, #f1f4f9 55%, #e7ecf5 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes siPop { from { opacity: 0; transform: scale(0.55); } to { opacity: 0.95; transform: scale(1); } }
        @keyframes siFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes siCardIn { from { opacity: 0; transform: translateY(20px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .si-tile { position: absolute; animation: siFloat var(--fd) ease-in-out var(--fdelay) infinite; }
        .si-tilein { animation: siPop 0.55s cubic-bezier(.2,.8,.2,1) both; will-change: transform, opacity; }
        .si-card { animation: siCardIn 0.6s cubic-bezier(.2,.8,.2,1) both; }
        .si-btn { transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease; }
        .si-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(20,30,60,0.14); border-color: #c7cede; }
        @media (prefers-reduced-motion: reduce) {
          .si-tile, .si-tilein, .si-card { animation: none !important; }
          .si-tilein { opacity: 0.95 !important; }
        }
      `}</style>

      {/* Decorative field of all 45 real AWS service icons */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {TILES.map((t, i) => (
          <div key={i} className="si-tile"
            style={{ left: `${t.left}%`, top: `${t.top}%`, "--fd": `${t.floatDur}s`, "--fdelay": `${t.floatDelay}s` }}>
            <div className="si-tilein" style={{ animationDelay: `${t.popDelay}s` }}>
              <div style={{ width: t.size, height: t.size, borderRadius: t.size * 0.28, background: "#ffffff", boxShadow: "0 4px 14px rgba(20,30,60,0.10), 0 0 0 1px rgba(20,30,60,0.05)", display: "flex", alignItems: "center", justifyContent: "center", transform: "translate(-50%, -50%)" }}>
                <img src={`/icons/${t.icon}`} alt="" width={t.size * 0.62} height={t.size * 0.62} style={{ objectFit: "contain" }} loading="eager" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sign-in card (hidden during the brief auth check so an authed owner
          never flashes the sign-in card - they just see the icon field). */}
      {!loading && (
      <div className="si-card" style={{ position: "relative", width: 380, maxWidth: "calc(100vw - 32px)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: 22, padding: "40px 36px 32px", boxShadow: "0 24px 70px rgba(30,45,90,0.22), 0 0 0 1px rgba(30,45,90,0.06)", textAlign: "center" }}>
        {/* Logo tile */}
        <div style={{ width: 60, height: 60, borderRadius: 16, margin: "0 auto 18px", background: "#1c1e21", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 22px rgba(28,30,33,0.28)" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
            <path d="M6.5 10v2.5h11V10M12 17v-2.5" />
          </svg>
        </div>

        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827", margin: 0 }}>System Design</h1>
        <p style={{ fontSize: 13.5, color: "#6b7280", margin: "8px 0 26px", lineHeight: 1.5 }}>
          Sign in to design, save, and share<br />AWS &amp; GCP architecture diagrams.
        </p>

        <a href="/api/auth/login" className="si-btn"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", boxSizing: "border-box", padding: "12px 0", fontSize: 14, fontWeight: 600, borderRadius: 12, background: "#ffffff", color: "#1f2937", border: "1px solid #e2e6ee", cursor: "pointer", textDecoration: "none", boxShadow: "0 2px 8px rgba(20,30,60,0.06)" }}>
          <GoogleG /> Continue with Google
        </a>

        <p style={{ fontSize: 11.5, color: "#9aa3b2", margin: "18px 0 0" }}>
          Owner access only. AI generation stays private.
        </p>

        {import.meta.env.DEV && (
          <button onClick={devBypass}
            style={{ marginTop: 14, background: "none", border: "none", color: "#6366f1", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Continue without signing in (dev)
          </button>
        )}
      </div>
      )}
    </div>
  );
}
