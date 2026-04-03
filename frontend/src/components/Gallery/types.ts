export interface GalleryItem {
  titleKey: string;
  author: string;
  views: string;
  likes: string;
  image: string;
  video?: string;
  className: string;
}

export interface GalleryProps {
  variant?: "landing" | "page";
}
