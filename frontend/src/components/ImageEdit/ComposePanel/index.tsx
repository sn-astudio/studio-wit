"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { composeApi } from "@/services/api";

import { ImageSlot } from "./ImageSlot";
import type { ComposePanelProps } from "./types";

export function ComposePanel({
  baseImageUrl,
  onComposeComplete,
}: ComposePanelProps) {
  const t = useTranslations("ImageEdit");

  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(
    null,
  );
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canGenerate =
    !!baseImageUrl && !!referenceImageUrl && prompt.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (!baseImageUrl || !referenceImageUrl || !prompt.trim()) return;

    setIsLoading(true);
    try {
      const result = await composeApi.create({
        baseImageUrl,
        referenceImageUrl,
        prompt: prompt.trim(),
      });
      onComposeComplete(result.resultUrl);
    } finally {
      setIsLoading(false);
    }
  }, [baseImageUrl, referenceImageUrl, prompt, onComposeComplete]);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* 베이스 이미지 */}
      <ImageSlot
        label={t("composeBaseImage")}
        imageUrl={baseImageUrl}
        onSelect={() => {}}
        readOnly
      />

      {/* 합성할 이미지 */}
      <ImageSlot
        label={t("composeReferenceImage")}
        imageUrl={referenceImageUrl}
        onSelect={setReferenceImageUrl}
        onRemove={() => setReferenceImageUrl(null)}
      />

      {/* 프롬프트 */}
      <div className="space-y-1.5">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("composePrompt")}
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-primary focus:outline-none"
        />
      </div>

      {/* 합성 버튼 */}
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate || isLoading}
        className="w-full cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-1.5 size-4 animate-spin" />
            {t("composeLoading")}
          </>
        ) : (
          t("composeGenerate")
        )}
      </Button>
    </div>
  );
}
