// Builds the 1200x630 share card for one saved design: brand mark, title, the
// pattern line, a chip row, and the diagram itself previewed underneath.
//
// The whole card is ONE SVG - the diagram SVG that lib/render-svg.js already
// produces is nested inside it as a child <svg> with its own viewBox, so it
// scales to fit without re-laying anything out. A single SVG means a single
// resvg rasterise, no compositing step.
import { renderDiagramSvg } from "./render-svg.js";
import iconManifest from "./icon-data.js";
import { BRANDS } from "../src/brands.js";

export const OG_W = 1200;
export const OG_H = 630;

const PAD = 52;
const CARD_Y = 262; // top of the white diagram card
const CARD_H = 316;

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// Roboto is close enough to uniform that a per-size average beats measuring:
// the only thing riding on it is where we wrap, and a word too far just drops
// to the next line.
function wrap(text, size, maxWidth, maxLines, bold = false) {
  const per = size * (bold ? 0.56 : 0.52);
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length * per > maxWidth && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    const room = Math.floor(maxWidth / per);
    if (last.length > room) lines[maxLines - 1] = `${last.slice(0, Math.max(0, room - 1)).trimEnd()}…`;
  }
  return lines;
}

const DIFFICULTY = {
  1: ["Easy", "#1a7f37", "#dafbe1", "#a7e5b6"],
  2: ["Easy", "#1a7f37", "#dafbe1", "#a7e5b6"],
  3: ["Medium", "#9a6700", "#fff8c5", "#ecd77e"],
  4: ["Medium", "#9a6700", "#fff8c5", "#ecd77e"],
  5: ["Medium", "#9a6700", "#fff8c5", "#ecd77e"],
  6: ["Hard", "#bc4c00", "#fff1e5", "#f5c396"],
  7: ["Hard", "#bc4c00", "#fff1e5", "#f5c396"],
  8: ["Hard", "#bc4c00", "#fff1e5", "#f5c396"],
  9: ["Expert", "#cf222e", "#ffebe9", "#ffc1bc"],
  10: ["Expert", "#cf222e", "#ffebe9", "#ffc1bc"],
};

// The demo's real-world logo (Mailchimp, Stripe, ...) when the title has one.
// Keyed the same way the gallery card keys it, and resolved through the icon
// manifest so it inlines as a data URI with no filesystem read.
function brandIcon(title) {
  const b = BRANDS[String(title || "").trim().toLowerCase()];
  return b && iconManifest[b.icon] ? iconManifest[b.icon] : null;
}

function chip(x, y, label, fill, stroke, ink) {
  const w = label.length * 7.4 + 26;
  return (
    `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="30" rx="15" fill="${fill}" stroke="${stroke}"/>` +
    `<text x="${(x + w / 2).toFixed(1)}" y="${y + 20}" font-size="14" font-weight="700" fill="${ink}" text-anchor="middle">${esc(label)}</text>`
  );
}

// Pulls the diagram SVG apart just far enough to re-emit it as a nested <svg>
// sized to the preview card. preserveAspectRatio does the letterboxing.
function nestDiagram(nodes, edges, x, y, w, h) {
  let inner;
  try {
    inner = renderDiagramSvg(nodes, edges, { destination: false });
  } catch {
    return "";
  }
  const vb = /viewBox="([^"]+)"/.exec(inner);
  if (!vb) return "";
  const body = inner.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return (
    `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb[1]}" ` +
    `preserveAspectRatio="xMidYMid meet" font-family="Roboto, Inter, sans-serif">${body}</svg>`
  );
}

/**
 * @param {object} design - { title, pattern, description, nodes, edges, difficulty }
 * @returns {string} a self-contained 1200x630 SVG
 */
export function renderOgSvg(design = {}) {
  const nodes = Array.isArray(design.nodes) ? design.nodes : [];
  const edges = Array.isArray(design.edges) ? design.edges : [];
  const title = design.title || "System Design";
  const sub = design.pattern || design.description || "";

  const logo = brandIcon(title);
  const titleX = logo ? PAD + 66 : PAD;

  const titleLines = wrap(title, 44, OG_W - titleX - PAD - 150, 2, true);
  const titleTop = 92 + (titleLines.length === 1 ? 14 : 0);
  const subY = titleTop + titleLines.length * 52 + 6;
  const subLines = sub ? wrap(sub, 19, OG_W - PAD * 2 - 20, 2) : [];

  const P = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `,
    `width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}" font-family="Roboto, Inter, sans-serif">`,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0" stop-color="#fbfcfd"/><stop offset="1" stop-color="#eceff3"/></linearGradient></defs>`,
    `<rect width="${OG_W}" height="${OG_H}" fill="url(#bg)"/>`,
    // Brand rail: the one bit of colour, so the card is recognisable at thumbnail size.
    `<rect x="0" y="0" width="7" height="${OG_H}" fill="#1c1e21"/>`,
    `<text x="${PAD}" y="60" font-size="13" font-weight="700" fill="#8a8d91" letter-spacing="2.4">SYSTEM DESIGN</text>`,
  ];

  if (logo) {
    P.push(`<image x="${PAD}" y="${titleTop - 34}" width="48" height="48" href="${esc(logo)}" preserveAspectRatio="xMidYMid meet"/>`);
  }

  titleLines.forEach((line, i) => {
    P.push(
      `<text x="${titleX}" y="${titleTop + i * 52}" font-size="44" font-weight="700" fill="#1c1e21">${esc(line)}</text>`,
    );
  });

  subLines.forEach((line, i) => {
    P.push(`<text x="${PAD}" y="${subY + i * 26}" font-size="19" fill="#5b6169">${esc(line)}</text>`);
  });

  // Chip row sits on the card's top edge, right-aligned so a long title never
  // collides with it.
  const chips = [];
  const d = DIFFICULTY[design.difficulty];
  if (d) chips.push([d[0], d[2], d[3], d[1]]);
  chips.push([`${nodes.length} nodes`, "#ffffff", "#d5dae1", "#5b6169"]);
  chips.push([`${edges.length} edges`, "#ffffff", "#d5dae1", "#5b6169"]);
  let cx = OG_W - PAD;
  for (const [label, fill, stroke, ink] of chips.reverse()) {
    const w = label.length * 7.4 + 26;
    cx -= w;
    P.push(chip(cx, CARD_Y - 46, label, fill, stroke, ink));
    cx -= 8;
  }

  // The preview itself.
  P.push(
    `<rect x="${PAD}" y="${CARD_Y}" width="${OG_W - PAD * 2}" height="${CARD_H}" rx="16" fill="#ffffff" stroke="#d5dae1"/>`,
  );
  P.push(nestDiagram(nodes, edges, PAD + 18, CARD_Y + 16, OG_W - PAD * 2 - 36, CARD_H - 32));
  P.push(`</svg>`);
  return P.join("");
}
