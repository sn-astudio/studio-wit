import type { SettingGroupProps } from "./types";

export function SettingGroup({ label, icon, children }: SettingGroupProps) {
  return (
    <div className="space-y-2 rounded-xl bg-zinc-900/50 p-3">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <span className="text-xs font-medium text-zinc-400">{label}</span>
      </div>
      {children}
    </div>
  );
}
