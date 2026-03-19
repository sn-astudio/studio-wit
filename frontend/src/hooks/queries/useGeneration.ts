import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { generationApi } from "@/services/api";
import type {
  GenerateRequest,
  GenerationListResponse,
  GenerationStatus,
  ModelType,
} from "@/types/api";
import { queryKeys } from "./keys";

export function useGeneration(id: string | null, polling = false) {
  return useQuery({
    queryKey: queryKeys.generation.detail(id!),
    queryFn: () => generationApi.get(id!),
    enabled: !!id,
    refetchInterval: polling ? 2000 : false,
  });
}

export function useCreateGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: GenerateRequest) => generationApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.generation.all,
      });
    },
  });
}

interface HistoryParams {
  type?: ModelType;
  status?: GenerationStatus;
  limit?: number;
}

export function useGenerationHistory(params?: HistoryParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.generation.history(params),
    queryFn: ({ pageParam }) =>
      generationApi.list({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: GenerationListResponse) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
  });
}
