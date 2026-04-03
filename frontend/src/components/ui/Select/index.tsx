"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "group/select-trigger inline-flex h-8 cursor-pointer items-center justify-between gap-1.5 rounded-lg border-transparent px-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="size-4 opacity-50 transition-transform duration-200 group-aria-expanded/select-trigger:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> & { title?: string }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={8} side="top" align="start" className="z-[9999]">
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            className,
          )}
          {...props}
        >
          {title && (
            <div className="px-3 pt-1 pb-1.5 text-[13px] font-semibold tracking-wide text-foreground">
              {title}
            </div>
          )}
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="flex size-4 shrink-0 items-center justify-center">
        <Check className="size-4 text-neutral-800 dark:text-white" strokeWidth={2.5} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
