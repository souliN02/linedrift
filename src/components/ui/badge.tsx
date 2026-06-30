import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Small inline label. `value` is the positive/edge signal (emerald, matching the
// chart's positive line colour since the theme tokens are all grayscale);
// `best` marks the best available price; `neutral` is for muted chips (overround).
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.7rem] leading-none font-medium whitespace-nowrap tabular-nums",
  {
    variants: {
      variant: {
        value: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        best: "border-primary/30 bg-primary/10 text-foreground",
        neutral: "border-border bg-muted/50 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant = "neutral",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
