"use client";

import {
  Crop,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  SlidersHorizontal,
  Scaling,
  Pencil,
  Eraser,
  Type,
  RotateCcw,
  Sparkles,
  Grid3x3,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import type { EditorToolbarProps } from "./types";

export function EditorToolbar({
  activeTool,
  onToolChange,
  onRotate,
  onFlipH,
  onFlipV,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hideFilter = false,
}: EditorToolbarProps) {
  const t = useTranslations("ImageEditor");

  const tools = [
    { id: "crop" as const, icon: Crop, label: t("crop"), onClick: () => onToolChange("crop"), isActive: activeTool === "crop" },
    { id: "rotate" as const, icon: RotateCw, label: t("rotate"), onClick: onRotate, isActive: false },
    { id: "freeRotate" as const, icon: RotateCcw, label: t("freeRotate"), onClick: () => onToolChange("freeRotate"), isActive: activeTool === "freeRotate" },
    { id: "flipH" as const, icon: FlipHorizontal2, label: t("flipH"), onClick: onFlipH, isActive: false },
    { id: "flipV" as const, icon: FlipVertical2, label: t("flipV"), onClick: onFlipV, isActive: false },
    { id: "resize" as const, icon: Scaling, label: t("resize"), onClick: () => onToolChange("resize"), isActive: activeTool === "resize" },
    { id: "draw" as const, icon: Pencil, label: t("draw"), onClick: () => onToolChange("draw"), isActive: activeTool === "draw" },
    { id: "eraser" as const, icon: Eraser, label: t("eraser"), onClick: () => onToolChange("eraser"), isActive: activeTool === "eraser" },
    { id: "text" as const, icon: Type, label: t("text"), onClick: () => onToolChange("text"), isActive: activeTool === "text" },
    ...(!hideFilter
      ? [{ id: "filter" as const, icon: SlidersHorizontal, label: t("filter"), onClick: () => onToolChange("filter"), isActive: activeTool === "filter" }]
      : []),
    { id: "mosaic" as const, icon: Grid3x3, label: t("mosaic"), onClick: () => onToolChange("mosaic"), isActive: activeTool === "mosaic" },
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
