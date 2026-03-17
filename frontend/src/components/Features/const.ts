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
  },
  {
    icon: Palette,
    titleKey: "styleTransferTitle",
    descriptionKey: "styleTransferDesc",
    badgeKey: null,
  },
  {
    icon: Camera,
    titleKey: "imageEnhancementTitle",
    descriptionKey: "imageEnhancementDesc",
    badgeKey: null,
  },
  {
    icon: Video,
    titleKey: "textToVideoTitle",
    descriptionKey: "textToVideoDesc",
    badgeKey: "badgeNew",
  },
  {
    icon: Clapperboard,
    titleKey: "imageToVideoTitle",
    descriptionKey: "imageToVideoDesc",
    badgeKey: "badgeNew",
  },
  {
    icon: Wand2,
    titleKey: "videoEditTitle",
    descriptionKey: "videoEditDesc",
    badgeKey: null,
  },
];
