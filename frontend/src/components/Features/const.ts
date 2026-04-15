import {
  Image,
  Video,
  Scissors,
  Palette,
  ScanEye,
  Film,
} from "lucide-react";
import type { Tool } from "./types";

export const TOOLS: Tool[] = [
  {
    icon: Image,
    titleKey: "textToImageTitle",
    descriptionKey: "textToImageDesc",
    badgeKey: null,
    href: "/image",
    image:
      "https://plus.unsplash.com/premium_photo-1728657016169-a425d4b5f813?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    icon: Video,
    titleKey: "textToVideoTitle",
    descriptionKey: "textToVideoDesc",
    badgeKey: "badgeNew",
    href: "/video",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop",
    video: "https://assets.mixkit.co/videos/32809/32809-720.mp4",
  },
  {
    icon: Film,
    titleKey: "imageToVideoTitle",
    descriptionKey: "imageToVideoDesc",
    badgeKey: "badgeNew",
    href: "/video-edit?tab=ai",
    image:
      "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&auto=format&fit=crop",
    video: "https://assets.mixkit.co/videos/32647/32647-720.mp4",
  },
  {
    icon: Scissors,
    titleKey: "videoEditTitle",
    descriptionKey: "videoEditDesc",
    badgeKey: null,
    href: "/video-edit",
    image:
      "https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&auto=format&fit=crop",
    video: "https://assets.mixkit.co/videos/4421/4421-720.mp4",
  },
  {
    icon: Palette,
    titleKey: "styleTransferTitle",
    descriptionKey: "styleTransferDesc",
    badgeKey: null,
    href: "/image-edit",
    image:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&auto=format&fit=crop",
  },
  {
    icon: ScanEye,
    titleKey: "imageEnhancementTitle",
    descriptionKey: "imageEnhancementDesc",
    badgeKey: null,
    href: "/image-edit",
    image:
      "https://plus.unsplash.com/premium_photo-1771195168401-0daa7741e045?w=800&auto=format&fit=crop",
  },
];
