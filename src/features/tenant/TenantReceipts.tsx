import { Receipt as ReceiptIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { MethodBadge } from "@/components/money/MethodBadge";
import { Money } from "@/components/ui/Money";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { useData } from "@/hooks/useData";
import { DEMO_TENANT_ID } from "@/data/seed";
import { methodLabel } from "@/domain/labels";
import { dateShort, periodLabel } from "@/lib/format";

export function TenantReceipts() {
  const d = useData();
  const receipts = d.receipts.filter((r) => r.tenantId === DEMO_TENANT_ID).sort((a, b) => b.period.localeCompare(a.period));
  const years = Array.from(new Set(receipts.map((r) => r.period.slice(0, 4))));
  const total = receipts.filter((r) => r.period.startsWith(years[0] ?? "")).reduce((s, r) => s + r.amount, 0);

  return (
    <main className="mx-auto max-w-[720px] px-4 pb-10 pt-6 md:px-5">
      <h1 className="type-display text-[32px] font-semibold">Quittances</h1>
      <p className="mt-1 text-[14px] text-ink-3">Chaque paiement complet génère une quittance officielle, vérifiable par QR code.</p>

      {receipts.length === 0 ? (
        <Panel className="mt-6">
          <EmptyState icon={<ReceiptIcon size={22} />} title="Pas encore de quittance" body="Elle apparaîtra ici dès votre premier loyer réglé." />
        </Panel>
      ) : (
        <>
          <Panel className="mt-6 flex items-end justify-between gap-4 p-5">
            <div>
              <p className="text-[13px] text-ink-3">Payé en {years[0]}</p>
              <Money value={total} className="mt-1 block text-[34px] font-semibold" />
            </div>
            <p className="text-right text-[13px] text-ink-3">
              {receipts.length} quittances
              <br />
              disponibles
            </p>
          </Panel>
          {years.map((y) => (
            <section key={y} className="mt-6">
              <h2 className="mb-2 text-[13px] font-medium text-ink-3">{y}</h2>
              <Panel className="overflow-hidden">
                <ul>
                  {receipts
                    .filter((r) => r.period.startsWith(y))
                    .map((r, i) => {
                      const pay = d.payments.find((p) => r.paymentIds.includes(p.id));
                      return (
                        <motion.li
                          key={r.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-t border-line first:border-t-0"
                        >
                          <Link to={`/quittance/${r.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-2">
                            {pay ? <MethodBadge method={pay.method} size={34} /> : <ReceiptIcon size={20} />}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-medium">{periodLabel(r.period)}</span>
                              <span className="block text-[12.5px] text-ink-3">
                                {pay ? `${methodLabel[pay.method]}, le ${dateShort(pay.settledAt!)}` : dateShort(r.issuedAt)}
                              </span>
                            </span>
                            <span className="text-right">
                              <Money value={r.amount} className="block text-[17px] font-semibold" currency={null} />
                              <span className="block font-mono text-[11px] text-ink-3">{r.number}</span>
                            </span>
                          </Link>
                        </motion.li>
                      );
                    })}
                </ul>
              </Panel>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
