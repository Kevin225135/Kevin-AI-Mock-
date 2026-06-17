import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
  {
    variants: {
      tone: {
        neutral: "border-border/80 bg-card/70 text-muted-foreground",
        teal: "border-primary/20 bg-primary/10 text-primary",
        amber: "border-brass/20 bg-brass/10 text-brass",
        coral: "border-coral/20 bg-coral/10 text-coral",
        slate: "border-ink/10 bg-ink/5 text-ink/70"
      }
    },
    defaultVariants: {
      tone: "neutral"
    }
  }
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ children, tone, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ tone, className }))}
      {...props}
    >
      {children}
    </span>
  );
}

export { badgeVariants };
