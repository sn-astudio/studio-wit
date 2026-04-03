export interface EffectsPanelProps {
  onApplySharpen: (amount: number) => void;
  onApplyVignette: (intensity: number) => void;
  onApplyNoise: (amount: number) => void;
  onCancel: () => void;
}
