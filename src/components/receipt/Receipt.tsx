import { brand } from "@/brand/brand";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import type { Data } from "@/domain/selectors";
import { levelLabel, methodLabel, unitTitle } from "@/domain/labels";
import type { Receipt as ReceiptT } from "@/domain/types";
import { periodToDate } from "@/lib/clock";
import { amount, dateLong, periodLabel, time } from "@/lib/format";
import { numberToWords } from "@/lib/numberToWords";

/*
  Quittance de loyer. Paper is always light, like the printed document it
  stands for. Uses the standard French wording, the amount in letters, the
  payment trace (InTouch transaction) and a QR code to verify it.
*/
export function ReceiptDoc({ d, receipt }: { d: Data; receipt: ReceiptT }) {
  const unit = d.units.find((u) => u.id === receipt.unitId)!;
  const property = d.properties.find((p) => p.id === receipt.propertyId)!;
  const tenant = d.tenants.find((t) => t.id === receipt.tenantId)!;
  const owner = d.owners.find((o) => o.id === property.ownerId)!;
  const payments = d.payments.filter((p) => receipt.paymentIds.includes(p.id));
  const start = periodToDate(receipt.period, 1);
  const end = periodToDate(receipt.period, 31);
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    const url = `${window.location.origin}/quittance/${receipt.id}?v=${receipt.verifyCode}`;
    QRCode.toDataURL(url, { margin: 0, width: 220, color: { dark: brand.id === "loclic" ? "#1f2350" : "#0b1913", light: "#00000000" } }).then(setQr);
  }, [receipt.id, receipt.verifyCode]);

  return (
    <article
      className="receipt-paper relative mx-auto w-full max-w-[560px] text-[color:var(--receipt-ink)]"
      aria-label={`Quittance ${receipt.number}`}
    >
      <div className="receipt-edge-bottom bg-[var(--receipt-paper)] pb-8 shadow-[0_30px_60px_-30px_rgb(var(--shadow-tint)/0.45)]">
        <div className="h-1.5 bg-[var(--receipt-accent)]" />
        <div className="px-7 pb-4 pt-7 sm:px-9">
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <LogoMark size={30} tile />
              <div>
                {brand.id === "loclic" ? (
                  <p className="text-[13px] font-black leading-none tracking-[-0.02em]">
                    <span className="block text-[8.5px] font-extrabold tracking-[0.07em]">
                      TOUCH<span className="text-[color:var(--receipt-accent)]">POINT</span>
                    </span>
                    Loclic
                  </p>
                ) : (
                  <p className="type-display text-[13px] font-bold leading-none" style={{ fontStretch: "80%" }}>
                    bailly
                  </p>
                )}
                <p className="mt-1 text-[11px] text-[color:var(--receipt-muted)]">{brand.id === "loclic" ? "Groupe InTouch" : "Gestion locative"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[11.5px] text-[color:var(--receipt-muted)]">N° {receipt.number}</p>
              <p className="mt-0.5 text-[11.5px] text-[color:var(--receipt-muted)]">Émise le {dateLong(receipt.issuedAt)}</p>
            </div>
          </header>

          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="type-display text-[34px] font-semibold leading-none sm:text-[40px]">Quittance de loyer</h1>
              <p className="mt-2 text-[14px] text-[color:var(--receipt-ink-2)]">{periodLabel(receipt.period)}</p>
            </div>
            <div
              className="shrink-0 -rotate-6 rounded-[10px] border-2 border-[color:var(--receipt-accent)] px-3 py-1.5 text-center text-[color:var(--receipt-accent)]"
              aria-hidden
            >
              <p className="type-display text-[18px] font-bold uppercase leading-none tracking-wide">Payé</p>
              <p className="mt-0.5 font-mono text-[9.5px]">{dateLong(receipt.issuedAt)}</p>
            </div>
          </div>

          <dl className="mt-7 grid grid-cols-1 gap-x-6 gap-y-4 border-y border-dashed border-[color:var(--receipt-line)] py-5 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-[11.5px] text-[color:var(--receipt-muted)]">Bailleur</dt>
              <dd className="mt-0.5 font-medium">{owner.name}</dd>
              {receipt.issuerRole.startsWith("Mandataire") && (
                <dd className="text-[12px] text-[color:var(--receipt-muted)]">représenté par {receipt.issuerName}</dd>
              )}
            </div>
            <div>
              <dt className="text-[11.5px] text-[color:var(--receipt-muted)]">Locataire</dt>
              <dd className="mt-0.5 font-medium">{tenant.name}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11.5px] text-[color:var(--receipt-muted)]">Local loué</dt>
              <dd className="mt-0.5 font-medium">
                {unitTitle(unit.kind, unit.code)}, {levelLabel(unit.level).toLowerCase()}
              </dd>
              <dd className="text-[12px] text-[color:var(--receipt-muted)]">
                {property.name}, {property.address}, {property.city}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-[13px] leading-relaxed text-[color:var(--receipt-ink-2)]">
            {receipt.issuerRole.startsWith("Mandataire") ? `${receipt.issuerName}, mandataire du bailleur,` : `${owner.name}, bailleur,`} déclare
            avoir reçu de {tenant.name} la somme de{" "}
            <strong className="font-semibold text-[color:var(--receipt-ink)]">{numberToWords(receipt.amount)} francs CFA</strong> (
            {amount(receipt.amount)} FCFA) au titre du loyer et des charges pour la période du {start.getDate()}er au {Math.min(end.getDate(), 31)}{" "}
            {periodLabel(receipt.period).toLowerCase()}, et lui en donne quittance, sous réserve de tous droits.
          </p>

          <table className="num mt-5 w-full text-[13.5px]">
            <tbody>
              <tr>
                <td className="py-1.5 text-[color:var(--receipt-ink-2)]">Loyer</td>
                <td className="py-1.5 text-right">{amount(receipt.rent)} FCFA</td>
              </tr>
              <tr>
                <td className="py-1.5 text-[color:var(--receipt-ink-2)]">Charges</td>
                <td className="py-1.5 text-right">{amount(receipt.charges)} FCFA</td>
              </tr>
              <tr className="border-t border-[color:var(--receipt-ink)]">
                <td className="pt-3 font-semibold">Total réglé</td>
                <td className="pt-3 text-right">
                  <span className="type-display text-[24px] font-semibold">{amount(receipt.amount)}</span> <span className="text-[12px]">FCFA</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 flex items-end justify-between gap-5 rounded-[12px] bg-[var(--receipt-wash)] p-4">
            <div className="min-w-0 text-[12px] leading-relaxed text-[color:var(--receipt-ink-2)]">
              <p className="font-medium text-[color:var(--receipt-ink)]">Règlement</p>
              {payments.map((p) => (
                <p key={p.id}>
                  {amount(p.amount)} FCFA par {methodLabel[p.method]}, le {dateLong(p.settledAt ?? p.createdAt)} à {time(p.settledAt ?? p.createdAt)}
                  {p.providerRef && (
                    <span className="block font-mono text-[11px] text-[color:var(--receipt-muted)]">
                      {p.channel === "intouch" ? "Transaction InTouch" : "Référence"} {p.providerRef}
                    </span>
                  )}
                </p>
              ))}
              <p className="mt-2 text-[11px] text-[color:var(--receipt-muted)]">
                Code de vérification <span className="font-mono font-medium text-[color:var(--receipt-ink)]">{receipt.verifyCode}</span>
              </p>
            </div>
            {qr ? (
              <img src={qr} alt="QR code de vérification de la quittance" className="size-[84px] shrink-0" />
            ) : (
              <div className="size-[84px] shrink-0" />
            )}
          </div>

          <p className="mt-5 text-[10.5px] leading-relaxed text-[color:var(--receipt-muted)]">
            Cette quittance annule tous les reçus qui auraient pu être établis précédemment pour la même période. Document généré par {brand.name},
            vérifiable en scannant le code ci-dessus.
          </p>
        </div>
      </div>
    </article>
  );
}
