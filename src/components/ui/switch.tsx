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
        "peer data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=unchecked]:bg-slate-500 data-[state=unchecked]:border-slate-600 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:data-[state=unchecked]:bg-slate-600 dark:data-[state=unchecked]:border-slate-400",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full border-2 ring-0 shadow-sm transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=checked]:bg-primary-foreground data-[state=checked]:border-slate-700 dark:data-[state=checked]:border-slate-300 data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-background data-[state=unchecked]:border-slate-700 dark:data-[state=unchecked]:border-slate-300"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
