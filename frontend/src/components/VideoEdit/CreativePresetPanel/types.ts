import type { ReactNode } from "react";

export interface CreativePresetPanelProps {
  sourceUrl: string | null;
  onApplied?: (resultUrl: string) => void;
  onPreviewOverlay?: (overlay: ReactNode | null) => void;
  onPreviewFilter?: (css: string) => void;
  onSave?: (resultUrl: string, isPublic: boolean) => Promise<void>;
}

export interface PresetDefinition {
  id: string;
  labelKey: string;
  descKey: string;
  icon: string;
  fields: PresetField[];
  cssFilter?: string;
  customUI?: boolean;
}

export interface PresetField {
  key: string;
  labelKey: string;
  type: "text" | "color";
  defaultValue: string;
}
