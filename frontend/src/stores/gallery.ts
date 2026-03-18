/**
 * 갤러리 상태 관리 (Zustand)
 * - 공개 갤러리 목록 조회
 * - 좋아요 토글
 */

import { create } from "zustand";

import type { GalleryItem, ModelType } from "@/types/api";
import { galleryApi } from "@/services/api";

interface GalleryState {
  /** 갤러리 아이템 목록 */
  items: GalleryItem[];
  cursor: string | null;
  hasMore: boolean;
  /** 로딩 상태 */
  isLoading: boolean;

  /** 갤러리 목록 조회 */
  fetchGallery: (params?: {
    type?: ModelType;
    model_id?: string;
    sort?: "recent" | "popular";
    reset?: boolean;
  }) => Promise<void>;

  /** 좋아요 토글 */
  toggleLike: (generationId: string) => Promise<void>;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  items: [],
  cursor: null,
  hasMore: false,
  isLoading: false,

  fetchGallery: async (params) => {
    const { cursor, items } = get();
    const reset = params?.reset ?? false;

    set({ isLoading: true });
    try {
      const res = await galleryApi.list({
        type: params?.type,
        model_id: params?.model_id,
        sort: params?.sort,
        cursor: reset ? undefined : (cursor ?? undefined),
        limit: 20,
      });

      set({
        items: reset ? res.items : [...items, ...res.items],
        cursor: res.next_cursor,
        hasMore: res.has_more,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleLike: async (generationId) => {
    try {
      const res = await galleryApi.toggleLike(generationId);

      // 로컬 상태 업데이트
      set((state) => ({
        items: state.items.map((item) =>
          item.id === generationId
            ? { ...item, is_liked: res.is_liked, like_count: res.like_count }
            : item,
        ),
      }));
    } catch {
      // 에러 무시 (UI에서 별도 처리)
    }
  },
}));
