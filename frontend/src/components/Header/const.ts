import {
  Image,
  Wand2,
  Video,
  Film,
  Scissors,
  LayoutGrid,
} from "lucide-react";
import type { NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  {
    labelKey: "image",
    href: "/image",
    children: [
      { labelKey: "imageGenerate", descKey: "imageGenerateDesc", href: "/image", icon: Image },
      { labelKey: "imageEdit", descKey: "imageEditDesc", href: "/image-edit", icon: Wand2 },
    ],
  },
  {
    labelKey: "video",
    href: "/video",
    children: [
      { labelKey: "videoGenerate", descKey: "videoGenerateDesc", href: "/video", icon: Video },
      { labelKey: "videoEdit", descKey: "videoEditDesc", href: "/video-edit", icon: Scissors },
    ],
  },
  { labelKey: "gallery", href: "/gallery", icon: LayoutGrid },
];
