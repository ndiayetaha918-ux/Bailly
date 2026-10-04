import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* z-index scale: nav 30, overlay 40, sheet 50, toast 60. */

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 520,
  side = "right",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  width?: number;
  side?: "right" | "bottom";
}) {
  const reduce = useReducedMotion();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-40 bg-[var(--scrim)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className={cn(
                  "fixed z-50 flex flex-col bg-surface shadow-[var(--shadow-float)] outline-none",
                  side === "right"
                    ? "inset-y-2 right-2 w-[calc(100vw-16px)] rounded-[var(--radius-panel)] border border-line"
                    : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[24px] border-t border-line",
                )}
                style={side === "right" ? { maxWidth: width } : undefined}
                initial={reduce ? { opacity: 0 } : side === "right" ? { x: 40, opacity: 0 } : { y: "100%" }}
                animate={reduce ? { opacity: 1 } : side === "right" ? { x: 0, opacity: 1 } : { y: 0 }}
                exit={reduce ? { opacity: 0 } : side === "right" ? { x: 40, opacity: 0 } : { y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
                  <div className="min-w-0">
                    <Dialog.Title className="type-display text-xl font-semibold">{title}</Dialog.Title>
                    {description && <Dialog.Description className="mt-1 text-sm text-ink-3">{description}</Dialog.Description>}
                  </div>
                  <Dialog.Close
                    className="-mr-2 grid size-9 shrink-0 place-items-center rounded-[10px] text-ink-3 hover:bg-surface-3 hover:text-ink"
                    aria-label="Fermer"
                  >
                    <X size={18} />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 460,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-40 bg-[var(--scrim)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 grid place-items-end p-2 sm:place-items-center sm:p-4">
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className="pointer-events-auto w-full rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-float)] outline-none"
                  style={{ maxWidth: width }}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                >
                  <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
                    <div>
                      <Dialog.Title className="type-display text-xl font-semibold">{title}</Dialog.Title>
                      {description && <Dialog.Description className="mt-1 text-sm text-ink-3">{description}</Dialog.Description>}
                    </div>
                    <Dialog.Close
                      className="-mr-2 grid size-9 shrink-0 place-items-center rounded-[10px] text-ink-3 hover:bg-surface-3 hover:text-ink"
                      aria-label="Fermer"
                    >
                      <X size={18} />
                    </Dialog.Close>
                  </div>
                  <div className="px-6 pb-6 pt-2">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
