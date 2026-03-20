import { SCRAMBLE_CHARS } from "./const";

export function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

export function ease(t: number) {
  return 1 - Math.pow(1 - t, 2);
}
