import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const tones = [
  "bg-[#d4ebdf] text-[#0b5b3e]",
  "bg-[#dfe6f3] text-[#2c4a7a]",
  "bg-[#f3e1d9] text-[#8a3a1c]",
  "bg-[#e6e2f1] text-[#4b3d7a]",
  "bg-[#f1ead2] text-[#6e5508]",
  "bg-[#d9ece9] text-[#1e5b55]",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center font-semibold", tones[hash(name) % tones.length], className)}
      style={{ width: size, height: size, borderRadius: size * 0.32, fontSize: size * 0.36 }}
    >
      {initials(name) || name.slice(0, 2).toUpperCase()}
    </span>
  );
}
