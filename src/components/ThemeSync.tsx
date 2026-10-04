import { useEffect } from "react";
import { useStore } from "@/store/store";

/** Applies the theme preference to <html data-theme>. */
export function ThemeSync() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      root.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
