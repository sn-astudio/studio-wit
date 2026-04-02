import type { LucideIcon } from "lucide-react";

export interface Tool {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  badgeKey: string | null;
  href: string | null;
  image: string;
  video?: string;
  imageStyle?: "cover" | "contain";
  imageBg?: string;
}
