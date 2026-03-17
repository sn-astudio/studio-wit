import type * as React from "react";

export type CardSize = "default" | "sm";

export type CardProps = React.ComponentProps<"div"> & { size?: CardSize };
