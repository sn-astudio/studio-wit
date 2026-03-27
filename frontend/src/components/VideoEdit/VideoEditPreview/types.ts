export interface TextOverlayPreview {
  text: string;
  position: string;
  fontSize: number;
  color: string;
}

export interface WatermarkPreview {
  mode: "text" | "image";
  text?: string;
  imageUrl?: string;
  position: string;
  opacity: number;
  fontSize?: number;
  color?: string;
  imageScale?: number; // % of video width (default 25)
}

export interface SubtitlePreviewItem {
  text: string;
  startTime: number;
  endTime: number;
  position: string;
  fontSize: number;
  color: string;
}

export interface VideoEditPreviewProps {
  videoUrl: string | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationLoaded: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cssFilter?: string;
  textOverlay?: TextOverlayPreview | null;
  watermark?: WatermarkPreview | null;
  subtitles?: SubtitlePreviewItem[];
  playbackRate?: number;
}
