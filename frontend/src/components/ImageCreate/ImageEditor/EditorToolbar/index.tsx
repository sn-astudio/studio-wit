"use client";

import {
  Crop,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Scaling,
  Pencil,
  Eraser,
  Pipette,
  Shapes,
  Type,
  RotateCcw,
  ZoomIn,
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

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {/* 변환 그룹 */}
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
          onClick={() => onToolChange("freeRotate")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "freeRotate" && "bg-primary/20 text-primary",
          )}
        >
          <RotateCcw className="size-4" />
          <span className="text-xs">{t("freeRotate")}</span>
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("resize")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "resize" && "bg-primary/20 text-primary",
          )}
        >
          <Scaling className="size-4" />
          <span className="text-xs">{t("resize")}</span>
        </Button>

        <div className="mx-1 h-5 w-px bg-zinc-700" />

        {/* 그리기 그룹 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("draw")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "draw" && "bg-primary/20 text-primary",
          )}
        >
          <Pencil className="size-4" />
          <span className="text-xs">{t("draw")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("eraser")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "eraser" && "bg-primary/20 text-primary",
          )}
        >
          <Eraser className="size-4" />
          <span className="text-xs">{t("eraser")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("shape")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "shape" && "bg-primary/20 text-primary",
          )}
        >
          <Shapes className="size-4" />
          <span className="text-xs">{t("shape")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("text")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "text" && "bg-primary/20 text-primary",
          )}
        >
          <Type className="size-4" />
          <span className="text-xs">{t("text")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("eyedropper")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "eyedropper" && "bg-primary/20 text-primary",
          )}
        >
          <Pipette className="size-4" />
          <span className="text-xs">{t("eyedropper")}</span>
        </Button>

        <div className="mx-1 h-5 w-px bg-zinc-700" />

        {/* 보정/뷰 그룹 */}
        {!hideFilter && (
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
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("effects")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "effects" && "bg-primary/20 text-primary",
          )}
        >
          <Sparkles className="size-4" />
          <span className="text-xs">{t("effects")}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("mosaic")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "mosaic" && "bg-primary/20 text-primary",
          )}
        >
          <Grid3x3 className="size-4" />
          <span className="text-xs">{t("mosaic")}</span>
        </Button>

        <div className="mx-1 h-5 w-px bg-zinc-700" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToolChange("zoom")}
          className={cn(
            "cursor-pointer gap-1.5",
            activeTool === "zoom" && "bg-primary/20 text-primary",
          )}
        >
          <ZoomIn className="size-4" />
          <span className="text-xs">{t("zoom")}</span>
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
