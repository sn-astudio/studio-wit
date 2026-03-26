import {
  Image,
  Video,
  Wand2,
  Palette,
  Camera,
  Clapperboard,
} from "lucide-react";
import type { Tool } from "./types";

export const TOOLS: Tool[] = [
  {
    icon: Image,
    titleKey: "textToImageTitle",
    descriptionKey: "textToImageDesc",
    badgeKey: null,
    href: "/image",
  },
  {
    icon: Palette,
    titleKey: "styleTransferTitle",
    descriptionKey: "styleTransferDesc",
    badgeKey: null,
    href: null,
  },
  {
    icon: Camera,
    titleKey: "imageEnhancementTitle",
    descriptionKey: "imageEnhancementDesc",
    badgeKey: null,
    href: null,
  },
  {
    icon: Video,
    titleKey: "textToVideoTitle",
    descriptionKey: "textToVideoDesc",
    badgeKey: "badgeNew",
    href: "/video",
  },
  {
    icon: Clapperboard,
    titleKey: "imageToVideoTitle",
    descriptionKey: "imageToVideoDesc",
    badgeKey: "badgeNew",
    href: "/video-edit?tab=ai",
  },
  {
    icon: Wand2,
    titleKey: "videoEditTitle",
    descriptionKey: "videoEditDesc",
    badgeKey: null,
    href: "/video-edit",
  },
];
