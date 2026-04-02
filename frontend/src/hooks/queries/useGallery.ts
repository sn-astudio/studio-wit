import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { galleryApi } from "@/services/api";
import type {
  CommentListResponse,
  GalleryListResponse,
  ModelType,
} from "@/types/api";
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

export function useGalleryDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.gallery.detail(id),
    queryFn: () => galleryApi.get(id),
    enabled: !!id,
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

export function useComments(generationId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.gallery.comments(generationId),
    queryFn: ({ pageParam }) =>
      galleryApi.listComments(generationId, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: CommentListResponse) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    enabled: !!generationId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      generationId,
      content,
    }: {
      generationId: string;
      content: string;
    }) => galleryApi.createComment(generationId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.gallery.comments(variables.generationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.gallery.all });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
    }: {
      commentId: number;
      generationId: string;
    }) => galleryApi.deleteComment(commentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.gallery.comments(variables.generationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.gallery.all });
    },
  });
}
