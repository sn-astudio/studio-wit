export interface TrimControlsProps {
  trimStart: number;
  trimEnd: number;
  duration: number;
  isTrimming: boolean;
  onTrim: () => void;
  onReset: () => void;
}
