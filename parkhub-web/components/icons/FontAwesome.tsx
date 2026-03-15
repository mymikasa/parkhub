"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";

interface FontAwesomeProps {
  icon: IconProp;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  spin?: boolean;
  pulse?: boolean;
}

const sizeMap = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
  "2xl": "text-xl",
};

export function Icon({
  icon,
  className = "",
  size = "md",
  spin = false,
  pulse = false,
}: FontAwesomeProps) {
  return (
    <FontAwesomeIcon
      icon={icon}
      className={`${sizeMap[size]} ${className}`}
      spin={spin}
      pulse={pulse}
    />
  );
}

export { FontAwesomeIcon };
