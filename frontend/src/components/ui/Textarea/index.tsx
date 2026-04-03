"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({
  className,
  onChange,
  value,
  ...props
}: React.ComponentProps<"textarea">) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = parseFloat(getComputedStyle(textarea).maxHeight) || Infinity;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, []);

  // value가 외부에서 변경될 때도 높이 조절
  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
    },
    [adjustHeight, onChange],
  );

  return (
    <textarea
      ref={textareaRef}
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30",
        className,
      )}
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
}

export { Textarea };
