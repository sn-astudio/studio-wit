import type { EditorTool } from "../types";

export interface EditorToolbarProps {
  activeTool: EditorTool | null;
  onToolChange: (tool: EditorTool | null) => void;
  onRotate: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hideFilter?: boolean;
}
