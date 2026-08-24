import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "press inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border font-mono text-[0.78rem] font-medium tracking-[0.14em] uppercase select-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid: "press-ink border-ink bg-cobalt text-paper hover:bg-cobalt-deep",
        ghost: "press-wash border-(--line-strong) bg-transparent text-ink hover:border-ink",
        cream: "press-cream border-cream bg-cream text-void hover:bg-white",
        bare: "border-transparent text-cobalt underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 px-4",
        md: "h-12 px-6",
        lg: "h-13 px-7 text-[0.82rem]",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/** House button: hard offset shadow that presses flat on hover/active. */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

/** Anchor with identical chrome, for real links (mailto, external, hash). */
const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & VariantProps<typeof buttonVariants>
>(({ className, variant, size, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(buttonVariants({ variant, size }), "no-underline", className)}
    {...props}
  />
));
ButtonLink.displayName = "ButtonLink";

export { Button, ButtonLink, buttonVariants };
