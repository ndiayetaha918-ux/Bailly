import { Bank, Money as MoneyIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Overlay";
import { toast } from "@/components/ui/Toast";
import type { Invoice } from "@/domain/types";
import { useStore } from "@/store/store";
import { amount, fcfa, periodLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export function RecordPaymentModal({
  invoice,
  open,
  onOpenChange,
  actorId,
}: {
  invoice: Invoice | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actorId: string;
}) {
  const record = useStore((s) => s.recordManualPayment);
  const rest = invoice ? invoice.amount - invoice.paid : 0;
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [value, setValue] = useState(String(rest));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(String(rest));
      setError(null);
    }
  }, [open, rest]);

  if (!invoice) return null;

  const submit = () => {
    const n = Number(value.replace(/\s/g, ""));
    if (!n || n <= 0) return setError("Indiquez un montant.");
    if (n > rest) return setError(`Le montant dépasse le reste dû (${fcfa(rest)}).`);
    record({ invoiceId: invoice.id, amount: n, method, actorId });
    onOpenChange(false);
    toast(
      n >= rest ? "Paiement enregistré, quittance émise" : "Paiement partiel enregistré",
      `${fcfa(n)} pour ${periodLabel(invoice.period).toLowerCase()}`,
    );
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Enregistrer un paiement"
      description={`Échéance de ${periodLabel(invoice.period).toLowerCase()}, reste ${fcfa(rest)}`}
    >
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: "cash", label: "Espèces", icon: <MoneyIcon size={20} /> },
              { v: "transfer", label: "Virement", icon: <Bank size={20} /> },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => setMethod(o.v)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] border p-3 text-left text-[14px] font-medium transition-colors",
                method === o.v ? "border-emerald bg-mint-soft text-mint-ink" : "border-line hover:border-line-strong",
              )}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
        <Field label="Montant reçu (FCFA)" error={error} hint="Un paiement partiel laisse l'échéance ouverte.">
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d\s]/g, ""))}
              className="num type-display text-[20px]"
            />
          )}
        </Field>
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setValue(String(rest))} className="text-[13px] font-medium text-emerald hover:underline">
            Tout le reste dû ({amount(rest)})
          </button>
          <Button variant="primary" onClick={submit}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
