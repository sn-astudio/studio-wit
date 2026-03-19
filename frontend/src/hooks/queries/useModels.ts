import { useQuery } from "@tanstack/react-query";
import { modelsApi } from "@/services/api";
import type { ModelType } from "@/types/api";
import { queryKeys } from "./keys";

export function useModels(type?: ModelType) {
  return useQuery({
    queryKey: queryKeys.models.list(type),
    queryFn: () => modelsApi.list(type),
    staleTime: 5 * 60 * 1000,
  });
}
