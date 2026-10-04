import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Info } from "@phosphor-icons/react";
import { create } from "zustand";

interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone: "success" | "info";
}

const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, "id">) => void; drop: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 3600);
  },
  drop: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = (title: string, body?: string, tone: ToastItem["tone"] = "success") => useToasts.getState().push({ title, body, tone });

export function Toaster() {
  const items = useToasts((s) => s.items);
  const drop = useToasts((s) => s.drop);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      <AnimatePresence>
        {items.map((t) => (
          <motion.button
            key={t.id}
            layout
            onClick={() => drop(t.id)}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex max-w-md items-start gap-3 rounded-[16px] bg-forest px-4 py-3 text-left text-on-forest shadow-[var(--shadow-float)]"
          >
            {t.tone === "success" ? (
              <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-mint" />
            ) : (
              <Info size={20} weight="fill" className="mt-0.5 shrink-0 text-mint" />
            )}
            <span>
              <span className="block text-sm font-medium">{t.title}</span>
              {t.body && <span className="block text-[13px] text-on-forest-2">{t.body}</span>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
