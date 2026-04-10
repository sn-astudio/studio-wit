export interface GalleryItem {
  titleKey: string;
  author: string;
  views: string;
  likes: string;
  image: string;
  video?: string;
  style: string;
}

export interface GalleryProps {
  variant?: "landing" | "page";
}
