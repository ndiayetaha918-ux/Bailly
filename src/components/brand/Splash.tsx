import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { BRAND_ID, brand } from "@/brand/brand";
import { cn } from "@/lib/cn";

/*
  Entry screen. The mark is a three-storey elevation: its windows switch on
  one by one, like a building at dusk, then the wordmark settles and the
  screen lifts to reveal the lobby. Shown once per browser session.
*/

const KEY = `${brand.id}-splash-seen`;

const windows = [
  { x: 8, y: 21, w: 16, lit: false },
  { x: 8, y: 14, w: 7, lit: false },
  { x: 17, y: 14, w: 7, lit: true },
  { x: 8, y: 7, w: 7, lit: true },
  { x: 17, y: 7, w: 7, lit: false },
];

function seen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function Splash() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => !seen());

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => close(), reduce ? 700 : 2300);
    return () => clearTimeout(t);
  }, [show, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          aria-label={`Entrer dans ${brand.name}`}
          onClick={close}
          className={cn(
            "fixed inset-0 z-[70] flex cursor-pointer flex-col items-center justify-center",
            BRAND_ID === "loclic" ? "bg-paper" : "forest-surface",
          )}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: reduce ? 0 : -24, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        >
          {BRAND_ID === "loclic" ? (
            <LoclicSplashMark reduce={!!reduce} />
          ) : (
            <>
              <motion.svg
                width="132"
                height="132"
                viewBox="0 0 32 32"
                aria-hidden
                initial={reduce ? false : { scale: 0.86, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="drop-shadow-[0_24px_48px_rgb(0_0_0/0.35)]"
              >
                <rect width="32" height="32" rx="9" fill="#0a2a1f" stroke="rgb(255 255 255 / 0.12)" strokeWidth="0.4" />
                {windows.map((w, i) => (
                  <motion.rect
                    key={i}
                    x={w.x}
                    y={w.y}
                    width={w.w}
                    height={5}
                    rx={1.2}
                    initial={reduce ? false : { fill: "rgba(233,243,237,0.12)" }}
                    animate={{ fill: w.lit ? "#1fae76" : "rgba(233,243,237,0.92)" }}
                    transition={{ delay: 0.35 + i * 0.16, duration: 0.35 }}
                  />
                ))}
              </motion.svg>
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="type-display mt-7 text-[56px] font-bold text-on-forest"
                style={{ fontStretch: "80%", letterSpacing: "-0.045em" }}
              >
                bailly
              </motion.p>
              <motion.p
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.45, duration: 0.6 }}
                className="mt-2 text-[14px] text-on-forest-2"
              >
                {brand.tagline}
              </motion.p>
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* Touchpoint Loclic: the two circles meet, then the name settles. */
function LoclicSplashMark({ reduce }: { reduce: boolean }) {
  const spring = { type: "spring" as const, stiffness: 260, damping: 18 };
  return (
    <>
      <svg width="148" height="148" viewBox="0 0 32 32" aria-hidden className="overflow-visible">
        <defs>
          <clipPath id="splash-navy">
            <circle cx="12.6" cy="19.4" r="10.4" />
          </clipPath>
        </defs>
        <motion.circle
          cx="12.6"
          cy="19.4"
          r="10.4"
          fill="var(--tp-navy)"
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring, delay: 0.15 }}
        />
        <motion.g initial={reduce ? false : { scale: 0, x: 6, y: -6 }} animate={{ scale: 1, x: 0, y: 0 }} transition={{ ...spring, delay: 0.55 }}>
          <circle cx="22" cy="10.2" r="8.6" fill="var(--paper)" />
          <circle cx="22" cy="10.2" r="7.4" fill="#a81735" />
        </motion.g>
        <motion.circle
          cx="22"
          cy="10.2"
          r="7.4"
          fill="#7c1333"
          clipPath="url(#splash-navy)"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.3 }}
        />
      </svg>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 text-center leading-none"
      >
        <p className="text-[15px] font-extrabold tracking-[0.08em]">
          <span className="text-ink">TOUCH</span>
          <span className="text-emerald">POINT</span>
        </p>
        <p className="mt-1 text-[54px] font-black tracking-[-0.035em] text-ink">Loclic</p>
      </motion.div>
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.45, duration: 0.6 }}
        className="mt-3 text-[14px] text-ink-3"
      >
        {brand.tagline} Une app du groupe InTouch.
      </motion.p>
    </>
  );
}
