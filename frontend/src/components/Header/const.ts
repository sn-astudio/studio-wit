import type { NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "image", href: "/image" },
  {
    labelKey: "video",
    href: "/video",
    children: [
      { labelKey: "videoGenerate", href: "/video" },
      { labelKey: "videoEdit", href: "/video-edit" },
    ],
  },
  { labelKey: "gallery", href: "/gallery" },
];
