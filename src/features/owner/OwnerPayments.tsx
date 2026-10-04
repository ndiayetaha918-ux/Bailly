import { DownloadSimple, Receipt as ReceiptIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { MethodBadge } from "@/components/money/MethodBadge";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Form";
import { Tag } from "@/components/ui/Status";
import { toast } from "@/components/ui/Toast";
import { useData } from "@/hooks/useData";
import { DEMO_OWNER_ID } from "@/data/seed";
import { methodLabel, unitTitle } from "@/domain/labels";
import type { PaymentMethod } from "@/domain/types";
import { currentPeriod, periodOf, shiftPeriod } from "@/lib/clock";
import { amount, dateShort, fcfa, periodLabel, time } from "@/lib/format";
import { cn } from "@/lib/cn";

export function OwnerPayments({ scope = "owner" }: { scope?: "owner" | "manager" }) {
  const d = useData();
  const navigate = useNavigate();
  const propIds = d.properties.filter((p) => (scope === "owner" ? p.ownerId === DEMO_OWNER_ID : p.managerId)).map((p) => p.id);
  const [period, setPeriod] = useState(currentPeriod());
  const [propertyId, setPropertyId] = useState<string>("all");

  const periods = Array.from({ length: 12 }, (_, i) => shiftPeriod(currentPeriod(), -i));
  const unitsById = new Map(d.units.map((u) => [u.id, u]));

  const rows = useMemo(
    () =>
      d.payments
        .filter((p) => {
          const u = unitsById.get(p.unitId);
          if (!u || !propIds.includes(u.propertyId)) return false;
          if (propertyId !== "all" && u.propertyId !== propertyId) return false;
          if (p.status !== "succeeded" && p.status !== "pending") return false;
          return periodOf(new Date(p.settledAt ?? p.createdAt)) === period;
        })
        .sort((a, b) => (b.settledAt ?? b.createdAt).localeCompare(a.settledAt ?? a.createdAt)),
    [d, period, propertyId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const settled = rows.filter((r) => r.status === "succeeded");
  const total = settled.reduce((s, p) => s + p.amount, 0);
  const byMethod = settled.reduce<Partial<Record<PaymentMethod, number>>>((m, p) => ({ ...m, [p.method]: (m[p.method] ?? 0) + p.amount }), {});
  const online = settled.filter((p) => p.channel === "intouch").reduce((s, p) => s + p.amount, 0);

  const exportCsv = () => {
    const header = ["Date", "Bien", "Local", "Locataire", "Moyen", "Référence", "Montant (FCFA)", "Quittance"];
    const lines = rows.map((p) => {
      const u = unitsById.get(p.unitId)!;
      const prop = d.properties.find((x) => x.id === u.propertyId)!;
      const t = d.tenants.find((x) => x.id === p.tenantId);
      const r = d.receipts.find((x) => x.id === p.receiptId);
      return [
        dateShort(p.settledAt ?? p.createdAt),
        prop.name,
        u.code,
        t?.name ?? "",
        methodLabel[p.method],
        p.providerRef ?? "",
        String(p.amount),
        r?.number ?? "",
      ];
    });
    const csv = [header, ...lines].map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bailly-paiements-${period}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Export prêt", `${rows.length} paiements, ${periodLabel(period).toLowerCase()}`);
  };

  return (
    <main className="mx-auto max-w-[1320px] px-5 pb-20 pt-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-[34px] font-semibold md:text-[40px]">Paiements</h1>
          <p className="mt-1 text-[14px] text-ink-3">Tous les encaissements, en ligne et en espèces, avec leur quittance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[170px]">
            <Select aria-label="Mois" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10 text-[14px]">
              {periods.map((p) => (
                <option key={p} value={p}>
                  {periodLabel(p)}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-[210px]">
            <Select aria-label="Bien" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="h-10 text-[14px]">
              <option value="all">Tous les biens</option>
              {d.properties
                .filter((p) => propIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </div>
          <Button variant="secondary" icon={<DownloadSimple size={16} />} onClick={exportCsv} disabled={!rows.length}>
            Exporter
          </Button>
        </div>
      </div>

      <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-12">
        <Panel className="p-6 md:col-span-5">
          <p className="text-[13px] text-ink-3">Encaissé en {periodLabel(period).toLowerCase()}</p>
          <Money value={total} condensed className="mt-2 block text-[52px] font-semibold" />
          <p className="num mt-1 text-[13px] text-ink-3">
            {settled.length} paiements, dont {total ? Math.round((online / total) * 100) : 0} % en ligne via InTouch
          </p>
        </Panel>
        <Panel className="p-6 md:col-span-7">
          <p className="mb-4 text-[13px] text-ink-3">Par moyen de paiement</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {(Object.entries(byMethod) as Array<[PaymentMethod, number]>)
              .sort((a, b) => b[1] - a[1])
              .map(([m, v]) => (
                <li key={m} className="flex items-center gap-3">
                  <MethodBadge method={m} size={34} />
                  <span>
                    <span className="block text-[13px] text-ink-3">{methodLabel[m]}</span>
                    <span className="num block text-[15px] font-medium">{amount(v)}</span>
                  </span>
                </li>
              ))}
          </ul>
        </Panel>
      </section>

      <Panel className="mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={22} />}
            title="Aucun paiement sur cette période"
            body="Les paiements apparaissent ici dès qu'ils sont validés par InTouch ou enregistrés à la main."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-ink-3">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Local</th>
                  <th className="px-3 py-3 font-medium">Locataire</th>
                  <th className="px-3 py-3 font-medium">Moyen</th>
                  <th className="px-3 py-3 font-medium">Référence</th>
                  <th className="px-3 py-3 text-right font-medium">Montant</th>
                  <th className="px-5 py-3 text-right font-medium">Quittance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const u = unitsById.get(p.unitId)!;
                  const prop = d.properties.find((x) => x.id === u.propertyId)!;
                  const t = d.tenants.find((x) => x.id === p.tenantId);
                  const r = d.receipts.find((x) => x.id === p.receiptId);
                  const at = p.settledAt ?? p.createdAt;
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-t border-line hover:bg-surface-2"
                      onClick={() => navigate(`${scope === "owner" ? "/proprietaire" : "/gestionnaire"}/locaux/${u.id}`)}
                    >
                      <td className="px-5 py-3">
                        <span className="num">{dateShort(at)}</span>
                        <span className="num ml-2 text-[12.5px] text-ink-3">{time(at)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium">{unitTitle(u.kind, u.code)}</span>
                        <span className="block text-[12.5px] text-ink-3">{prop.name}</span>
                      </td>
                      <td className="px-3 py-3">{t?.name}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2">
                          <MethodBadge method={p.method} size={22} />
                          {methodLabel[p.method]}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[12.5px] text-ink-3">{p.providerRef ?? "-"}</td>
                      <td className={cn("num px-3 py-3 text-right font-medium", p.status === "pending" && "text-ink-3")}>{fcfa(p.amount)}</td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {r ? (
                          <Link to={`/quittance/${r.id}`} className="font-mono text-[12.5px] text-emerald hover:underline">
                            {r.number}
                          </Link>
                        ) : p.status === "pending" ? (
                          <Tag tone="amber">À confirmer</Tag>
                        ) : (
                          <span className="text-[12.5px] text-ink-3">Partiel</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  );
}
