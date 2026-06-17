"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-normal transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "border border-ink bg-ink text-primary-foreground shadow-subtle hover:-translate-y-0.5 hover:bg-ink/92 hover:shadow-lift",
        secondary:
          "border border-input bg-card/80 text-foreground shadow-subtle backdrop-blur hover:-translate-y-0.5 hover:bg-card hover:shadow-lift",
        outline:
          "border border-input bg-background/50 text-foreground hover:bg-card",
        ghost:
          "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        danger:
          "border border-destructive bg-destructive text-destructive-foreground shadow-subtle hover:-translate-y-0.5 hover:bg-coral/90"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "size-10"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
