import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-badge transition-colors",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        blue: "bg-badgeBlue text-badgeBlue-foreground",
        teal: "bg-teal/10 text-teal",
        amber: "bg-brass/10 text-brass",
        coral: "bg-coral/10 text-coral",
        slate: "bg-ink/5 text-ink/60",
        success: "bg-teal/10 text-teal",
        warning: "bg-brass/10 text-brass"
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
