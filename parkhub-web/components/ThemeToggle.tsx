"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Icon } from "@/components/icons/FontAwesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <span className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Icon icon={faSun} className="h-4 w-4" />
      ) : (
        <Icon icon={faMoon} className="h-4 w-4" />
      )}
      <span className="sr-only">切换主题</span>
    </Button>
  );
}
