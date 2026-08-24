import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[0.68rem] font-medium tracking-[0.12em] uppercase whitespace-nowrap",
  {
    variants: {
      variant: {
        line: "border-(--line-strong) text-ink-dim",
        cobalt: "border-transparent bg-cobalt text-paper",
        stamp:
          "border-cobalt text-cobalt [transform:rotate(-2deg)] border-[1.5px] tracking-[0.2em]",
        /* grade tints */
        pass: "border-transparent bg-pass/12 text-pass",
        info: "border-transparent bg-cobalt/12 text-cobalt",
        warn: "border-transparent bg-warn/12 text-warn",
        flag: "border-transparent bg-flag/12 text-flag",
      },
    },
    defaultVariants: { variant: "line" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Maps a letter grade to its tint. A→green, B→cobalt, C→gold, D→rust. */
export function gradeVariant(grade: string): "pass" | "info" | "warn" | "flag" {
  if (grade.startsWith("A")) return "pass";
  if (grade.startsWith("B")) return "info";
  if (grade.startsWith("C")) return "warn";
  return "flag";
}

export { Badge, badgeVariants };
