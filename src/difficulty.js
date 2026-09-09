// The 1-12 difficulty rank -> tier chip (label + colors).
//
// Shared because it is rendered twice: on the gallery card in the browser, and
// on the server-rendered share card. Those were separate copies, and they had
// already drifted - the share card used a 1-10 lookup table, so ranks 11 and 12
// (the two hardest demos) came out with no chip at all.
export function tierFor(d) {
  if (d == null) return null;
  if (d <= 2) return { label: "Easy", fg: "#15803d", bg: "#f0fdf4", bd: "#dcfce7" };
  if (d <= 5) return { label: "Medium", fg: "#b45309", bg: "#fffbeb", bd: "#fef3c7" };
  if (d <= 8) return { label: "Hard", fg: "#c2410c", bg: "#fff7ed", bd: "#ffedd5" };
  return { label: "Expert", fg: "#b91c1c", bg: "#fef2f2", bd: "#fee2e2" };
}
