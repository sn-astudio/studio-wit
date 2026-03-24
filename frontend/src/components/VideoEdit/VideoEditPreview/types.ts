export interface VideoEditPreviewProps {
  videoUrl: string | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationLoaded: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cssFilter?: string;
}
