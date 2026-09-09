// `npm run dev` used to start ONLY vite. Vite serves the SPA and proxies /api to
// serve.mjs on 4321 (see vite.config.js), so with nothing on 4321 every API call
// fails, the gallery falls back to the bundled IFTTT sample, and the page says
// "Could not reach the API" - which looks like a broken app rather than a
// missing second process.
//
// So dev starts both, and stops both together.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Args after `npm run dev --` (e.g. `--port 5174`) are meant for vite. Without
// this they were dropped and vite silently fell back to its default 5173, so
// whatever was watching the requested port saw the app as down.
const viteArgs = process.argv.slice(2);

const procs = [
  ["api", process.execPath, ["serve.mjs"]],
  ["web", process.execPath, [path.join("node_modules", "vite", "bin", "vite.js"), ...viteArgs]],
].map(([name, cmd, args]) => {
  const child = spawn(cmd, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const tag = (stream) => (buf) => {
    for (const line of String(buf).split("\n")) if (line.trim()) stream.write(`[${name}] ${line}\n`);
  };
  child.stdout.on("data", tag(process.stdout));
  child.stderr.on("data", tag(process.stderr));
  // If either half dies the pair is useless - a half-running dev setup is the
  // exact confusion this script exists to prevent. Take the other one with it.
  child.on("exit", (code) => {
    if (!stopping) {
      process.stderr.write(`[dev] ${name} exited (${code}) - stopping the other half too\n`);
      stop(code ?? 1);
    }
  });
  return child;
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of procs) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 200);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
