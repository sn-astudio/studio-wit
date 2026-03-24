import type { AspectRatio, GenerateParams } from "@/types/api";

/** frontend camelCase params → backend snake_case GenerateParams */
export function toImageGenerateParams(
  params: Record<string, string | number>,
): GenerateParams {
  const result: GenerateParams = {};
  if (params.aspectRatio)
    result.aspect_ratio = params.aspectRatio as AspectRatio;
  if (params.quality) result.quality = String(params.quality);
  if (params.guidanceScale)
    result.guidance_scale = Number(params.guidanceScale);
  if (params.steps) result.num_steps = Number(params.steps);
  if (params.style) result.style = String(params.style);
  return result;
}
