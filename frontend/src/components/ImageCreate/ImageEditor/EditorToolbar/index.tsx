"use client";

import {
  Crop,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { EditorToolbarProps } from "./types";

export function EditorToolbar({
  activeTool,
  onToolChange,
  onRotate,
  onFlipH,
  onFlipV,
}: EditorToolbarProps) {
  const t = useTranslations("ImageEditor");

  const tools = [
    { id: "crop" as const, icon: Crop, label: t("crop"), onClick: () => onToolChange("crop"), isActive: activeTool === "crop" },
    { id: "rotate" as const, icon: RotateCw, label: t("rotate"), onClick: onRotate, isActive: false },
    { id: "flipH" as const, icon: FlipHorizontal2, label: t("flipH"), onClick: onFlipH, isActive: false },
    { id: "flipV" as const, icon: FlipVertical2, label: t("flipV"), onClick: onFlipV, isActive: false },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={tool.onClick}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl py-3.5 text-[12px] font-[500] transition-all active:opacity-80",
              tool.isActive
                ? "bg-foreground text-background"
                : "bg-neutral-50 text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:bg-neutral-800/60 dark:hover:bg-neutral-800 dark:hover:text-white",
            )}
          >
            <Icon className="size-5" strokeWidth={1.5} />
            {tool.label}
          </button>
        );
      })}
    </div>
  );
}
