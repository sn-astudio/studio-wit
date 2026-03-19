export type CardSize = "standard" | "tall" | "wide";

export interface GalleryItem {
  titleKey: string;
  author: string;
  views: string;
  likes: string;
  gradient: string;
  size: CardSize;
}
