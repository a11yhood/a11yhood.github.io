"use client"

import { ComponentProps } from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary/75 data-[state=checked]:border-primary data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full border-2 border-border ring-0 shadow-[0_1px_2px_rgba(15,23,42,0.35),inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:shadow-[0_1px_2px_rgba(2,6,23,0.65),inset_0_0_0_1px_rgba(255,255,255,0.22)] transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-background"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
