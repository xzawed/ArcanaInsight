export function hexToRgba(hex: string, alpha: number, fallback = "212, 175, 55"): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(${fallback},${alpha})`;
  const r = Number.parseInt(result[1], 16);
  const g = Number.parseInt(result[2], 16);
  const b = Number.parseInt(result[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function hexToRgbBase(hex: string, fallback = "212, 175, 55"): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return fallback;
  const r = Number.parseInt(result[1], 16);
  const g = Number.parseInt(result[2], 16);
  const b = Number.parseInt(result[3], 16);
  return `${r}, ${g}, ${b}`;
}

export function hexToRgbComponents(hex: string, fallback = "139,92,246"): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return fallback;
  return `${Number.parseInt(m[1], 16)},${Number.parseInt(m[2], 16)},${Number.parseInt(m[3], 16)}`;
}
