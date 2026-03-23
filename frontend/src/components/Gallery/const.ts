import type { CardSize, GalleryItem } from "./types";

export const SIZE_CLASSES: Record<CardSize, string> = {
  standard: "",
  tall: "row-span-2",
  wide: "col-span-2",
};

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    titleKey: "neonCityscape",
    author: "creator_1",
    views: "12.4K",
    likes: "2.1K",
    gradient: "from-violet-600/30 to-blue-600/30",
    size: "tall",
  },
  {
    titleKey: "abstractDreams",
    author: "artist_42",
    views: "8.7K",
    likes: "1.5K",
    gradient: "from-pink-600/30 to-orange-600/30",
    size: "standard",
  },
  {
    titleKey: "oceanDepths",
    author: "deep_vision",
    views: "15.2K",
    likes: "3.8K",
    gradient: "from-cyan-600/30 to-teal-600/30",
    size: "standard",
  },
  {
    titleKey: "cosmicVoyage",
    author: "stargazer",
    views: "20.1K",
    likes: "5.2K",
    gradient: "from-purple-600/30 to-indigo-600/30",
    size: "wide",
  },
  {
    titleKey: "goldenHour",
    author: "photo_ai",
    views: "9.3K",
    likes: "1.9K",
    gradient: "from-amber-600/30 to-yellow-600/30",
    size: "standard",
  },
  {
    titleKey: "digitalGarden",
    author: "nature_gen",
    views: "11.8K",
    likes: "2.7K",
    gradient: "from-emerald-600/30 to-green-600/30",
    size: "tall",
  },
];

export const STYLE_TAG_KEYS = [
  "photorealistic",
  "anime",
  "oilPainting",
  "sketch",
  "threeDRender",
  "watercolor",
  "comic",
  "pixelArt",
  "cinematic",
  "fantasy",
] as const;
