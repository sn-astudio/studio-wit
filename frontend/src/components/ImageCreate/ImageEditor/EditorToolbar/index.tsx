"use client";

import {
  Crop,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  SlidersHorizontal,
  Undo2,
  Redo2,
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
}: EditorToolbarProps) {
  const t = useTranslations("ImageEditor");

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("crop")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "crop" && "bg-primary/20 text-primary",
          )}
        >
          <Crop className="size-4" />
          <span className="text-xs">{t("crop")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRotate}
          className="cursor-pointer gap-1.5"
        >
          <RotateCw className="size-4" />
          <span className="text-xs">{t("rotate")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onFlipH}
          className="cursor-pointer gap-1.5"
        >
          <FlipHorizontal2 className="size-4" />
          <span className="text-xs">{t("flipH")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onFlipV}
          className="cursor-pointer gap-1.5"
        >
          <FlipVertical2 className="size-4" />
          <span className="text-xs">{t("flipV")}</span>
        </Button>

        <div className="mx-1 h-5 w-px bg-zinc-700" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("filter")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "filter" && "bg-primary/20 text-primary",
          )}
        >
          <SlidersHorizontal className="size-4" />
          <span className="text-xs">{t("filter")}</span>
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="cursor-pointer"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="cursor-pointer"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
