import type { LucideIcon } from "lucide-react";

export interface NavItem {
  labelKey: string;
  descKey?: string;
  href: string;
  icon?: LucideIcon;
  children?: NavItem[];
}
