import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/*
  Entry screen. The mark is a three-storey elevation: its windows switch on
  one by one, like a building at dusk, then the wordmark settles and the
  screen lifts to reveal the lobby. Shown once per browser session.
*/

const KEY = "bailly-splash-seen";

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
          aria-label="Entrer dans Bailly"
          onClick={close}
          className="forest-surface fixed inset-0 z-[70] flex cursor-pointer flex-col items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: reduce ? 0 : -24, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        >
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
            Chaque local, chaque loyer.
          </motion.p>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
