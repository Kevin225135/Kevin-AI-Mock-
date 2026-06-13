"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-pine text-white hover:bg-teal-800 focus-visible:outline-pine disabled:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-ink hover:bg-slate-50 focus-visible:outline-pine",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-pine",
  danger:
    "bg-coral text-white hover:bg-red-800 focus-visible:outline-coral disabled:bg-slate-300"
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
