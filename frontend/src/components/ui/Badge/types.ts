import type { useRender } from "@base-ui/react/use-render";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "./const";

export type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;
