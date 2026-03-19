import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { galleryApi } from "@/services/api";
import type { GalleryListResponse, ModelType } from "@/types/api";
import { queryKeys } from "./keys";

interface GalleryListParams {
  type?: ModelType;
  model_id?: string;
  sort?: "recent" | "popular";
  limit?: number;
}

export function useGalleryList(params?: GalleryListParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.gallery.list(params),
    queryFn: ({ pageParam }) =>
      galleryApi.list({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: GalleryListResponse) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (generationId: string) => galleryApi.toggleLike(generationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gallery.all });
    },
  });
}
