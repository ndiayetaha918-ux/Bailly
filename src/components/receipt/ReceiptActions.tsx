import { DownloadSimple, ShareNetwork, WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import type { Receipt } from "@/domain/types";
import { amount, periodLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ReceiptActions({ receipt, className, tone = "paper" }: { receipt: Receipt; className?: string; tone?: "paper" | "forest" }) {
  const url = `${window.location.origin}/quittance/${receipt.id}`;
  const text = `Quittance de loyer ${periodLabel(receipt.period).toLowerCase()}, ${amount(receipt.amount)} FCFA (${receipt.number})`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Quittance de loyer", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast("Lien copié", "Collez-le dans un message ou un e-mail.", "info");
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <Button variant={tone === "forest" ? "on-forest" : "dark"} onClick={() => window.print()} icon={<DownloadSimple size={17} />}>
        PDF
      </Button>
      <Button variant={tone === "forest" ? "on-forest" : "secondary"} onClick={share} icon={<ShareNetwork size={17} />}>
        Partager
      </Button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] text-sm font-medium transition-colors active:scale-[0.98]",
          tone === "forest"
            ? "border border-white/12 bg-white/10 text-on-forest hover:bg-white/16"
            : "border border-line bg-surface text-ink hover:bg-surface-2",
        )}
      >
        <WhatsappLogo size={17} /> WhatsApp
      </a>
    </div>
  );
}
