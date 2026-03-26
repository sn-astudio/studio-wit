import type { Generation } from "@/types/api";

export interface AIEditPanelProps {
  sourceUrl: string | null;
  currentTime: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onDirty?: () => void;
  /** 부모에서 관리하는 AI 생성 ID */
  aiGenerationId: string | null;
  onAiGenerationIdChange: (id: string | null) => void;
  /** 부모에서 폴링된 생성 데이터 */
  aiGeneration: Generation | null;
  aiIsGenerating: boolean;
  aiIsCompleted: boolean;
  aiIsFailed: boolean;
  aiElapsed: number;
}
