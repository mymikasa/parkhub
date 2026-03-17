"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, placeholder, children, ...props }: SelectPrimitive.Value.Props & { placeholder?: React.ReactNode }) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("truncate", className)}
      {...props}
    >
      {children ?? ((value: string | null) => value ?? placeholder)}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group relative flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm transition-all duration-200",
        "outline-none select-none",
        "hover:border-blue-300 hover:bg-gray-50/50",
        "focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white",
        "data-placeholder:text-gray-400",
        "data-[size=default]:h-11 data-[size=sm]:h-9",
        "[&>svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-200",
        "data-[popup-open]:border-blue-500 [&>svg]:rotate-180",
        className
      )}
      {...props}
    >
      <span className="flex-1 text-left truncate">
        {children}
      </span>
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-50 group-hover:bg-gray-100 transition-colors">
        <SelectPrimitive.Icon
          render={
            <ChevronDownIcon className="size-3.5 text-gray-500 transition-transform duration-200" />
          }
        />
      </span>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative z-50 max-h-72 min-w-[var(--anchor-width)] w-auto overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg",
            "ring-1 ring-black/5",
            "origin-[--transform-origin] scale-[--transform-origin]",
            "transition-all duration-200",
            "data-[side=bottom]:mt-1 data-[side=top]:mb-1",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-100 data-[state=open]:slide-in-from-top-2",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-2",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <div className="max-h-inherit overflow-y-auto p-1">
            <SelectPrimitive.List>{children}</SelectPrimitive.List>
          </div>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
        "outline-none select-none transition-all duration-150",
        "text-gray-700",
        "hover:bg-blue-50 hover:text-blue-700",
        "focus:bg-blue-100 focus:text-blue-800",
        "data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700",
        "data-[selected]:bg-blue-100/30 data-[selected]:text-blue-800",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="absolute right-2 flex items-center justify-center" />
        }
      >
        <CheckIcon className="size-4 text-blue-600" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("my-1 h-px bg-gray-100", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "absolute top-0 z-10 flex w-full cursor-pointer items-center justify-center bg-gradient-to-b from-white to-gray-50 py-1.5",
        "opacity-0 transition-opacity duration-200",
        "hover:opacity-100",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4 text-gray-500" />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "absolute bottom-0 z-10 flex w-full cursor-pointer items-center justify-center bg-gradient-to-b from-gray-50 to-white py-1.5",
        "opacity-0 transition-opacity duration-200",
        "hover:opacity-100",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4 text-gray-500" />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
