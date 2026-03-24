import type { NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  {
    labelKey: "image",
    href: "/image",
    children: [
      { labelKey: "imageGenerate", href: "/image" },
      { labelKey: "imageEdit", href: "/image-edit" },
    ],
  },
  { labelKey: "video", href: "/video" },
  { labelKey: "gallery", href: "/gallery" },
];
