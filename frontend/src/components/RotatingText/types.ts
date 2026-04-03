export type RotatingWord = string | { action: string; suffix: string };

export interface RotatingTextProps {
  words: RotatingWord[];
  interval?: number;
  className?: string;
  highlightClassName?: string;
}
