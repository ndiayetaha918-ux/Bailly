import { lazy, Suspense } from "react";
import { createBrowserRouter, createHashRouter, createMemoryRouter, RouterProvider } from "react-router";
import { Lobby } from "@/features/lobby/Lobby";
import { ThemeSync } from "@/components/ThemeSync";
import { Toaster } from "@/components/ui/Toast";
import { Splash } from "@/components/brand/Splash";
import { PageFallback } from "@/components/layout/PageFallback";
import { OwnerShell } from "@/components/layout/OwnerShell";
import { ManagerShell } from "@/components/layout/ManagerShell";
import { TenantShell } from "@/components/layout/TenantShell";
import { NotFound } from "@/features/NotFound";

const OwnerHome = lazy(() => import("@/features/owner/OwnerHome").then((m) => ({ default: m.OwnerHome })));
const PropertyPage = lazy(() => import("@/features/owner/PropertyPage").then((m) => ({ default: m.PropertyPage })));
const OwnerPayments = lazy(() => import("@/features/owner/OwnerPayments").then((m) => ({ default: m.OwnerPayments })));
const OwnerExchanges = lazy(() => import("@/features/owner/OwnerExchanges").then((m) => ({ default: m.OwnerExchanges })));
const UnitPage = lazy(() => import("@/features/unit/UnitPage").then((m) => ({ default: m.UnitPage })));
const Triage = lazy(() => import("@/features/manager/Triage").then((m) => ({ default: m.Triage })));
const ManagerUnits = lazy(() => import("@/features/manager/ManagerUnits").then((m) => ({ default: m.ManagerUnits })));
const Claims = lazy(() => import("@/features/manager/Claims").then((m) => ({ default: m.Claims })));
const Collections = lazy(() => import("@/features/manager/Collections").then((m) => ({ default: m.Collections })));
const TenantHome = lazy(() => import("@/features/tenant/TenantHome").then((m) => ({ default: m.TenantHome })));
const PayFlow = lazy(() => import("@/features/tenant/PayFlow").then((m) => ({ default: m.PayFlow })));
const TenantReceipts = lazy(() => import("@/features/tenant/TenantReceipts").then((m) => ({ default: m.TenantReceipts })));
const TenantExchanges = lazy(() => import("@/features/tenant/TenantExchanges").then((m) => ({ default: m.TenantExchanges })));
const ReceiptPage = lazy(() => import("@/features/receipt/ReceiptPage").then((m) => ({ default: m.ReceiptPage })));
const PropertyBuilder = lazy(() => import("@/features/builder/PropertyBuilder"));

const page = (el: React.ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>;

// Static previews cannot rely on URL paths: hash routing for raw.githack, in-memory for claude.ai artifacts.
const mode = import.meta.env.VITE_ROUTER;
const makeRouter = mode === "memory" ? createMemoryRouter : mode === "hash" ? createHashRouter : createBrowserRouter;

const router = makeRouter([
  { path: "/", element: <Lobby /> },
  {
    path: "/proprietaire",
    element: <OwnerShell />,
    children: [
      { index: true, element: page(<OwnerHome />) },
      { path: "biens/:propertyId", element: page(<PropertyPage />) },
      { path: "locaux/:unitId", element: page(<UnitPage role="owner" />) },
      { path: "paiements", element: page(<OwnerPayments />) },
      { path: "echanges", element: page(<OwnerExchanges />) },
      {
        path: "nouveau-bien",
        element: page(<PropertyBuilder />),
      },
    ],
  },
  {
    path: "/gestionnaire",
    element: <ManagerShell />,
    children: [
      { index: true, element: page(<Triage />) },
      { path: "locaux", element: page(<ManagerUnits />) },
      { path: "locaux/:unitId", element: page(<UnitPage role="manager" />) },
      { path: "reclamations", element: page(<Claims />) },
      { path: "encaissements", element: page(<Collections />) },
    ],
  },
  {
    path: "/locataire",
    element: <TenantShell />,
    children: [
      { index: true, element: page(<TenantHome />) },
      { path: "payer", element: page(<PayFlow />) },
      { path: "recus", element: page(<TenantReceipts />) },
      { path: "echanges", element: page(<TenantExchanges />) },
    ],
  },
  { path: "/quittance/:receiptId", element: page(<ReceiptPage />) },
  { path: "*", element: <NotFound /> },
]);

export function App() {
  return (
    <>
      <ThemeSync />
      <RouterProvider router={router} />
      <Splash />
      <Toaster />
    </>
  );
}
