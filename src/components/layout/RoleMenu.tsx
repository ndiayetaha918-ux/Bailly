import { AnimatePresence, motion } from "motion/react";
import { ArrowCounterClockwise, Buildings, CaretDown, Check, House, Monitor, Moon, SignOut, Sun, UserFocus } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "@/components/ui/Toast";
import { useStore, type ThemePref } from "@/store/store";
import type { Role } from "@/domain/types";
import { cn } from "@/lib/cn";

const roleLinks: Array<{ role: Role; label: string; to: string; icon: React.ReactNode }> = [
  { role: "owner", label: "Propriétaire", to: "/proprietaire", icon: <Buildings size={16} /> },
  { role: "manager", label: "Gestionnaire", to: "/gestionnaire", icon: <UserFocus size={16} /> },
  { role: "tenant", label: "Locataire", to: "/locataire", icon: <House size={16} /> },
];

export function RoleMenu({
  role,
  name,
  subtitle,
  tone = "paper",
  compact = false,
  align = "right",
}: {
  role: Role;
  name: string;
  subtitle: string;
  tone?: "paper" | "forest";
  compact?: boolean;
  align?: "right" | "left-up";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const resetDemo = useStore((s) => s.resetDemo);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const themes: Array<{ v: ThemePref; label: string; icon: React.ReactNode }> = [
    { v: "light", label: "Clair", icon: <Sun size={15} /> },
    { v: "dark", label: "Sombre", icon: <Moon size={15} /> },
    { v: "system", label: "Système", icon: <Monitor size={15} /> },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2.5 rounded-[12px] p-1 pr-2 transition-colors",
          tone === "forest" ? "hover:bg-white/10" : "hover:bg-surface-3",
        )}
      >
        <Avatar name={name} size={compact ? 34 : 32} />
        {!compact && (
          <>
            <span className="hidden text-left leading-tight md:block">
              <span className={cn("block text-[13px] font-medium", tone === "forest" ? "text-on-forest" : "text-ink")}>{name}</span>
              <span className={cn("block text-[12px]", tone === "forest" ? "text-on-forest-2" : "text-ink-3")}>{subtitle}</span>
            </span>
            <CaretDown size={14} className={tone === "forest" ? "text-on-forest-2" : "text-ink-3"} />
          </>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: align === "left-up" ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: align === "left-up" ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "absolute z-50 w-64 rounded-[16px] border border-line bg-surface p-1.5 text-ink shadow-[var(--shadow-float)]",
              align === "right" ? "right-0 top-full mt-2" : "bottom-0 left-full ml-3",
            )}
          >
            <p className="px-2.5 pb-1 pt-2 text-[12px] font-medium text-ink-3">Changer de rôle</p>
            {roleLinks.map((r) => (
              <button
                key={r.role}
                onClick={() => {
                  setOpen(false);
                  navigate(r.to);
                }}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[14px] hover:bg-surface-2"
              >
                <span className="text-ink-3">{r.icon}</span>
                <span className="flex-1">{r.label}</span>
                {r.role === role && <Check size={15} className="text-emerald" weight="bold" />}
              </button>
            ))}
            <div className="my-1.5 h-px bg-line" />
            <p className="px-2.5 pb-1.5 pt-1 text-[12px] font-medium text-ink-3">Apparence</p>
            <div className="mx-1 mb-1 grid grid-cols-3 gap-1 rounded-[11px] bg-surface-3 p-1">
              {themes.map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTheme(t.v)}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1.5 rounded-[8px] text-[12px] font-medium",
                    theme === t.v ? "bg-surface text-ink shadow-[0_1px_2px_rgb(var(--shadow-tint)/0.12)]" : "text-ink-3",
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            <div className="my-1.5 h-px bg-line" />
            <button
              onClick={() => {
                resetDemo();
                setOpen(false);
                toast("Démo réinitialisée", "Les données fictives ont été restaurées.", "info");
              }}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[14px] hover:bg-surface-2"
            >
              <ArrowCounterClockwise size={16} className="text-ink-3" />
              Réinitialiser la démo
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[14px] hover:bg-surface-2"
            >
              <SignOut size={16} className="text-ink-3" />
              Retour à l'accueil
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
