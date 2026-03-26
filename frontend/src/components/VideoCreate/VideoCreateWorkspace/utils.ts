import type { AspectRatio, GenerateParams } from "@/types/api";

/** frontend camelCase params → backend snake_case GenerateParams */
export function toGenerateParams(
  params: Record<string, string | number>,
): GenerateParams {
  const result: GenerateParams = {};
  if (params.aspectRatio) result.aspect_ratio = params.aspectRatio as AspectRatio;
  if (params.duration) result.duration = Number(params.duration);
  if (params.cfgScale) result.cfg_scale = Number(params.cfgScale);
  return result;
}

/** params에서 negative_prompt 추출 */
export function extractNegativePrompt(
  params: Record<string, string | number>,
): string | undefined {
  const val = params.negativePrompt;
  return val && String(val).trim() ? String(val).trim() : undefined;
}
