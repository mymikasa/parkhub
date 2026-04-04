// ─── Lot icon color rotation ─────────────────────────
export const LOT_COLORS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
];

export function getLotColor(index: number) {
  return LOT_COLORS[index % LOT_COLORS.length];
}

export const LOT_ICONS = [
  "fa-solid fa-building",
  "fa-solid fa-shop",
  "fa-solid fa-house-chimney",
  "fa-solid fa-hotel",
  "fa-solid fa-warehouse",
];

export function getLotIcon(index: number) {
  return LOT_ICONS[index % LOT_ICONS.length];
}
