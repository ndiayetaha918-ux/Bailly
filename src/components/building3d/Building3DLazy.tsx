import { lazy, Suspense } from "react";
import type { Building3DProps } from "./Building3D";

const Impl = lazy(() => import("./Building3D").then((m) => ({ default: m.Building3D })));

export function Building3DLazy(props: Building3DProps) {
  return (
    <Suspense
      fallback={
        <div className={props.className}>
          <div className="grid h-full place-items-center text-[13px] text-ink-3">Chargement de la maquette…</div>
        </div>
      }
    >
      <Impl {...props} />
    </Suspense>
  );
}
