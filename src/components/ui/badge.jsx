import * as React from "react"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        pending: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        approved: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        rejected: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        in: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        out: "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
