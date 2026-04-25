export function chooseVariant(split: number): "variant" | "baseline" {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1) < split ? "variant" : "baseline";
}
