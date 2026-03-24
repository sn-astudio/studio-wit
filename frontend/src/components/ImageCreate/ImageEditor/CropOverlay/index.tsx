"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

import type { CropOverlayProps } from "./types";

export function CropOverlay({ cropRect, onApply, onCancel }: CropOverlayProps) {
  const t = useTranslations("ImageEditor");

  return (
    <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-2">
      <p className="text-xs text-zinc-400">
        {cropRect
          ? `${Math.round(cropRect.width)} × ${Math.round(cropRect.height)}`
          : t("cropHint")}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="cursor-pointer"
        >
          {t("cancel")}
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          disabled={!cropRect || cropRect.width < 2 || cropRect.height < 2}
          className="cursor-pointer"
        >
          {t("applyCrop")}
        </Button>
      </div>
    </div>
  );
}
