export function hexToRgba(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function hexToRgbComponents(hex: string, fallback = "139,92,246"): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return fallback;
  return `${Number.parseInt(m[1], 16)},${Number.parseInt(m[2], 16)},${Number.parseInt(m[3], 16)}`;
}
