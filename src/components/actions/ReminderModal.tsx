import { ChatCircleDots, DeviceMobile } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Overlay";
import { toast } from "@/components/ui/Toast";
import type { Invoice, Tenant, Unit } from "@/domain/types";
import { unitTitle } from "@/domain/labels";
import { useStore } from "@/store/store";
import { fcfa, firstName, periodLabel, phone } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ReminderModal({
  unit,
  tenant,
  invoices,
  open,
  onOpenChange,
  actorId,
  signature,
}: {
  unit: Unit;
  tenant: Tenant | undefined;
  invoices: Invoice[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actorId: string;
  signature: string;
}) {
  const send = useStore((s) => s.sendReminder);
  const [channel, setChannel] = useState<"WhatsApp" | "SMS">("WhatsApp");
  const owed = invoices.reduce((s, i) => s + i.amount - i.paid, 0);
  const periods = invoices.map((i) => periodLabel(i.period, false).toLowerCase()).join(" et ");
  const draft = `Bonjour ${tenant ? firstName(tenant.name) : ""}, sauf erreur de notre part, le loyer de ${periods} pour ${unitTitle(unit.kind, unit.code).toLowerCase()} reste dû (${fcfa(owed)}). Vous pouvez le régler directement depuis Bailly par Wave ou Orange Money. Merci. ${signature}`;
  const [text, setText] = useState(draft);
  useEffect(() => {
    if (open) setText(draft);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Relancer le locataire"
      description={tenant ? `${tenant.name}, ${phone(tenant.phone)}` : undefined}
      width={520}
    >
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: "WhatsApp", icon: <ChatCircleDots size={20} /> },
              { v: "SMS", icon: <DeviceMobile size={20} /> },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => setChannel(o.v)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] border p-3 text-left text-[14px] font-medium transition-colors",
                channel === o.v ? "border-emerald bg-mint-soft text-mint-ink" : "border-line hover:border-line-strong",
              )}
            >
              {o.icon}
              {o.v}
            </button>
          ))}
        </div>
        <Field label="Message" hint="Le lien de paiement est ajouté automatiquement.">
          {(id) => <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} className="min-h-[140px] text-[14px]" />}
        </Field>
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              send(unit.id, channel, actorId);
              onOpenChange(false);
              toast(`Relance envoyée par ${channel}`, tenant?.name);
            }}
          >
            Envoyer la relance
          </Button>
        </div>
      </div>
    </Modal>
  );
}
