import { useStore } from "@/store/store";
import type { Data } from "@/domain/selectors";
import { useShallow } from "zustand/react/shallow";

/** Subscribes to the data slices (not the actions) with shallow equality. */
export function useData(): Data {
  return useStore(
    useShallow((s) => ({
      owners: s.owners,
      managers: s.managers,
      tenants: s.tenants,
      properties: s.properties,
      units: s.units,
      invoices: s.invoices,
      payments: s.payments,
      receipts: s.receipts,
      threads: s.threads,
      messages: s.messages,
      events: s.events,
      entrances: s.entrances,
    })),
  );
}
