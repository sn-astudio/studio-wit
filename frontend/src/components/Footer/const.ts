import type { FooterLinkGroup } from "./types";

export const LINK_GROUPS: FooterLinkGroup[] = [
  {
    categoryKey: "product",
    linkKeys: ["imageGeneration", "videoGeneration", "gallery"],
  },
  {
    categoryKey: "company",
    linkKeys: ["about", "blog", "contact"],
  },
  {
    categoryKey: "legal",
    linkKeys: ["privacy", "terms"],
  },
];

export const SOCIAL_LINKS = ["X", "YouTube", "Instagram"];
