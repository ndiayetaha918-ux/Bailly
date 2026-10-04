import { ArrowLeft, Check, CheckCircle, Lock, WarningCircle, House } from "@phosphor-icons/react";
import { brand } from "@/brand/brand";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { MethodBadge } from "@/components/money/MethodBadge";
import { ReceiptDoc } from "@/components/receipt/Receipt";
import { ReceiptActions } from "@/components/receipt/ReceiptActions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { useData } from "@/hooks/useData";
import { useStore } from "@/store/store";
import { DEMO_TENANT_ID } from "@/data/seed";
import { invoiceToPay } from "@/domain/selectors";
import { methodLabel, unitTitle } from "@/domain/labels";
import type { GatewayMethod } from "@/services/payments";
import { amount, dateLong, fcfa, periodLabel, phone as fmtPhone } from "@/lib/format";
import { uid } from "@/lib/rng";
import { cn } from "@/lib/cn";

/*
  Tenant payment flow. Mirrors a real InTouch collection:
  choose method -> request pushed to the phone -> customer approves ->
  provider confirms -> quittance issued. The waiting state is a first-class
  screen, because that is where people hesitate.
*/

const METHODS: Array<{ v: GatewayMethod; hint: string }> = [
  ...(brand.id === "loclic" ? [{ v: "touchpoint" as const, hint: "Votre wallet TouchPoint, sans quitter le groupe InTouch" }] : []),
  { v: "wave", hint: "Validation dans l'application Wave" },
  { v: "orange_money", hint: "Validation avec votre code secret" },
  { v: "free_money", hint: "Validation avec votre code secret" },
  { v: "card", hint: "Visa ou Mastercard, page sécurisée" },
];

const approval: Record<GatewayMethod, string> = {
  wave: "Ouvrez Wave : une demande de paiement vous attend. Vérifiez le montant et validez.",
  orange_money: "Une notification Orange Money arrive sur votre téléphone. Saisissez votre code secret pour valider.",
  free_money: "Une demande Free Money arrive sur votre téléphone. Saisissez votre code secret pour valider.",
  touchpoint: "Ouvrez l'application TouchPoint : la demande de paiement vous attend. Confirmez avec votre code.",
  card: "Confirmez le paiement sur la page sécurisée de votre banque.",
};

export function PayFlow() {
  const d = useData();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const startPayment = useStore((s) => s.startPayment);
  const cancelPayment = useStore((s) => s.cancelPayment);

  const tenant = d.tenants.find((t) => t.id === DEMO_TENANT_ID)!;
  const unit = d.units.find((u) => u.tenantId === DEMO_TENANT_ID)!;
  const property = d.properties.find((p) => p.id === unit.propertyId)!;
  const [paymentId, setPaymentId] = useState<string | null>(() => {
    const live = d.payments.find((p) => p.unitId === unit.id && p.channel === "intouch" && (p.status === "pending" || p.status === "initiated"));
    return live?.id ?? null;
  });
  const payment = paymentId ? d.payments.find((p) => p.id === paymentId) : undefined;
  const lockedInvoiceId = useMemo(() => payment?.invoiceId, [payment?.invoiceId]);
  const invoice = lockedInvoiceId ? d.invoices.find((i) => i.id === lockedInvoiceId) : invoiceToPay(d, unit.id);

  const [method, setMethod] = useState<GatewayMethod>(brand.id === "loclic" ? "touchpoint" : "wave");
  const [mode, setMode] = useState<"all" | "part">("all");
  const [part, setPart] = useState("");
  const [msisdn, setMsisdn] = useState(fmtPhone(tenant.phone));
  const [error, setError] = useState<string | null>(null);

  const rest = invoice ? invoice.amount - invoice.paid : 0;
  const toCharge = mode === "all" ? rest : Number(part.replace(/\D/g, "")) || 0;
  const receipt = payment?.receiptId ? d.receipts.find((r) => r.id === payment.receiptId) : undefined;

  const stage: "review" | "processing" | "success" | "failed" = !payment
    ? "review"
    : payment.status === "succeeded"
      ? "success"
      : payment.status === "failed" || payment.status === "cancelled"
        ? "failed"
        : "processing";

  const submit = () => {
    if (!invoice) return;
    const digits = msisdn.replace(/\D/g, "");
    if (method !== "card" && !/^7\d{8}$/.test(digits)) return setError("Numéro invalide : 9 chiffres, commençant par 7.");
    if (mode === "part" && (toCharge < 1000 || toCharge > rest)) return setError(`Montant entre 1 000 et ${amount(rest)} FCFA.`);
    setError(null);
    const id = uid("pay");
    setPaymentId(id);
    startPayment({ invoiceId: invoice.id, method, phone: method === "card" ? undefined : `+221${digits}`, amount: toCharge, paymentId: id });
  };

  if (!invoice && stage === "review") {
    return (
      <main className="mx-auto grid max-w-[520px] place-items-center px-5 py-20 text-center">
        <CheckCircle size={44} weight="fill" className="text-emerald-bright" />
        <h1 className="type-display mt-4 text-[30px] font-semibold">Rien à payer</h1>
        <p className="mt-1 text-[14px] text-ink-3">Votre loyer est à jour.</p>
        <ButtonLink to="/locataire" variant="dark" className="mt-6">
          Retour à l'accueil
        </ButtonLink>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[620px] px-4 pb-32 pt-5 md:pb-16">
      {stage !== "success" && (
        <div className="flex items-center justify-between">
          <Link to="/locataire" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink">
            <ArrowLeft size={14} /> Accueil
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <Lock size={13} weight="fill" /> Paiement sécurisé par InTouch
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {stage === "review" && invoice && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="type-display mt-5 text-[32px] font-semibold">Payer le loyer</h1>

            <Panel className="mt-5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] text-ink-3">{periodLabel(invoice.period)}</p>
                  <p className="mt-0.5 text-[14px] font-medium">
                    {unitTitle(unit.kind, unit.code)}, {property.name}
                  </p>
                </div>
                <p className="text-[12.5px] text-ink-3">Échéance {dateLong(invoice.dueDate)}</p>
              </div>
              <dl className="num mt-4 grid gap-1.5 border-t border-line pt-4 text-[14px]">
                <div className="flex justify-between">
                  <dt className="text-ink-3">Loyer</dt>
                  <dd>{fcfa(invoice.rent)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-3">Charges</dt>
                  <dd>{fcfa(invoice.charges)}</dd>
                </div>
                {invoice.paid > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Déjà réglé</dt>
                    <dd>-{fcfa(invoice.paid)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex items-end justify-between gap-4">
                <Segmented
                  size="sm"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "all", label: "Tout régler" },
                    { value: "part", label: "Une partie" },
                  ]}
                />
                {mode === "all" ? (
                  <Money value={rest} className="text-[32px] font-semibold" />
                ) : (
                  <label className="flex items-baseline gap-1.5">
                    <span className="sr-only">Montant à payer</span>
                    <input
                      autoFocus
                      inputMode="numeric"
                      value={part}
                      onChange={(e) => setPart(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="150 000"
                      className="type-display num w-[150px] border-b-2 border-emerald bg-transparent text-right text-[30px] font-semibold placeholder:text-line-strong focus:outline-none"
                    />
                    <span className="text-[13px] text-ink-3">FCFA</span>
                  </label>
                )}
              </div>
            </Panel>

            <h2 className="mb-2.5 mt-7 text-[14px] font-medium text-ink-2">Moyen de paiement</h2>
            <div role="radiogroup" aria-label="Moyen de paiement" className="grid gap-2">
              {METHODS.map((m) => {
                const active = method === m.v;
                return (
                  <button
                    key={m.v}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMethod(m.v)}
                    className={cn(
                      "flex items-center gap-4 rounded-[16px] border bg-surface p-3.5 text-left transition-[border-color,box-shadow]",
                      active
                        ? "border-emerald shadow-[0_0_0_3px_color-mix(in_oklab,var(--emerald)_16%,transparent)]"
                        : "border-line hover:border-line-strong",
                    )}
                  >
                    <MethodBadge method={m.v} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{methodLabel[m.v]}</span>
                      <span className="block text-[12.5px] text-ink-3">{m.hint}</span>
                    </span>
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full border-2 transition-colors",
                        active ? "border-emerald bg-emerald text-white" : "border-line-strong",
                      )}
                    >
                      {active && <Check size={13} weight="bold" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence initial={false}>
              {method !== "card" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="mt-6 block">
                    <span className="text-[14px] font-medium text-ink-2">Numéro {methodLabel[method]}</span>
                    <span className="mt-2 flex h-14 items-center rounded-[var(--radius-control)] border border-line-strong bg-surface focus-within:border-emerald focus-within:ring-4 focus-within:ring-[color-mix(in_oklab,var(--emerald)_18%,transparent)]">
                      <span className="flex h-full items-center border-r border-line px-3.5 text-[15px] text-ink-3">+221</span>
                      <input
                        inputMode="tel"
                        value={msisdn}
                        onChange={(e) => setMsisdn(e.target.value.replace(/[^\d\s]/g, ""))}
                        className="num h-full flex-1 bg-transparent px-3.5 text-[18px] tracking-wide focus:outline-none"
                      />
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
            {error && <p className="mt-2 text-[13px] text-signal-ink">{error}</p>}

            <p className="mt-5 rounded-[12px] bg-surface-3 px-3.5 py-2.5 text-[12.5px] text-ink-3">
              Démo : la validation est simulée en quelques secondes. Un numéro finissant par 0000 simule un solde insuffisant.
            </p>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-4 backdrop-blur-md md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
              <Button variant="primary" size="lg" className="h-14 w-full text-[16px]" onClick={submit} disabled={toCharge <= 0}>
                Payer {amount(toCharge)} {brand.currency}
              </Button>
            </div>
          </motion.div>
        )}

        {stage === "processing" && payment && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="pt-10 text-center"
          >
            <div className="relative mx-auto grid size-40 place-items-center">
              {!reduce &&
                [0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-emerald/40"
                    initial={{ scale: 0.55, opacity: 0.8 }}
                    animate={{ scale: 1.15, opacity: 0 }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
                  />
                ))}
              <MethodBadge method={payment.method} size={76} className="relative shadow-[var(--shadow-float)]" />
            </div>
            <h1 className="type-display mt-8 text-[30px] font-semibold">
              {payment.status === "initiated" ? "Connexion à InTouch…" : "Validez sur votre téléphone"}
            </h1>
            <p className="mx-auto mt-2 max-w-[40ch] text-[14.5px] text-ink-2">{approval[payment.method as GatewayMethod]}</p>
            <p className="num mt-4 text-[14px] text-ink-3">
              {fcfa(payment.amount)}
              {payment.payerPhone && <>, {fmtPhone(payment.payerPhone)}</>}
            </p>

            <ol className="mx-auto mt-8 grid max-w-[340px] gap-3 text-left">
              {[
                { label: "Demande envoyée à InTouch", done: payment.status === "pending", active: payment.status === "initiated" },
                {
                  label: `Validation ${payment.method === "card" ? "bancaire" : "sur le téléphone"}`,
                  done: false,
                  active: payment.status === "pending",
                },
                { label: "Quittance émise", done: false, active: false },
              ].map((s) => (
                <li key={s.label} className="flex items-center gap-3 text-[14px]">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full",
                      s.done ? "bg-emerald-bright text-white" : s.active ? "border-2 border-emerald" : "border-2 border-line-strong",
                    )}
                  >
                    {s.done ? (
                      <Check size={13} weight="bold" />
                    ) : s.active ? (
                      <motion.span
                        className="size-2 rounded-full bg-emerald"
                        animate={reduce ? undefined : { opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    ) : null}
                  </span>
                  <span className={cn(s.done || s.active ? "text-ink" : "text-ink-3")}>{s.label}</span>
                </li>
              ))}
            </ol>

            <Button variant="ghost" className="mt-8" onClick={() => cancelPayment(payment.id)}>
              Annuler
            </Button>
            {payment.providerRef && <p className="mt-2 font-mono text-[11.5px] text-ink-3">Transaction {payment.providerRef}</p>}
          </motion.div>
        )}

        {stage === "failed" && payment && (
          <motion.div key="failed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-12 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-signal-soft text-signal">
              <WarningCircle size={40} weight="fill" />
            </div>
            <h1 className="type-display mt-6 text-[30px] font-semibold">
              {payment.status === "cancelled" ? "Paiement annulé" : "Le paiement n'a pas abouti"}
            </h1>
            <p className="mx-auto mt-2 max-w-[40ch] text-[14.5px] text-ink-2">{payment.failureReason ?? "Aucun montant n'a été prélevé."}</p>
            <p className="mt-1 text-[13px] text-ink-3">Aucun montant n'a été débité.</p>
            <div className="mx-auto mt-8 grid max-w-[360px] gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setPaymentId(null);
                }}
              >
                Réessayer
              </Button>
              <ButtonLink to="/locataire" variant="ghost">
                Plus tard
              </ButtonLink>
            </div>
          </motion.div>
        )}

        {stage === "success" && payment && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4">
            <div className="text-center">
              <motion.div
                initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-bright text-white"
              >
                <Check size={32} weight="bold" />
              </motion.div>
              <h1 className="type-display mt-4 text-[30px] font-semibold">Paiement reçu</h1>
              <p className="num mt-1 text-[14.5px] text-ink-2">
                {fcfa(payment.amount)} par {methodLabel[payment.method]}
                {receipt ? ", voici votre quittance." : ". Il reste un solde sur cette échéance."}
              </p>
            </div>

            {receipt ? (
              <div className="mt-8">
                {/* The quittance comes out of the slot like a printed ticket. */}
                <div className="relative z-[2] mx-auto h-3.5 max-w-[580px] rounded-full bg-forest shadow-[inset_0_-3px_0_rgb(0_0_0/0.35)]" />
                <div className="relative -mt-1.5 overflow-hidden px-2 pb-8">
                  <motion.div
                    initial={reduce ? false : { y: "-100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 2.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ReceiptDoc d={d} receipt={receipt} />
                  </motion.div>
                </div>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.2 }}
                  className="mx-auto max-w-[560px]"
                >
                  <ReceiptActions receipt={receipt} />
                  <Button variant="ghost" className="mt-3 w-full" icon={<House size={16} />} onClick={() => navigate("/locataire")}>
                    Retour à l'accueil
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="mx-auto mt-8 max-w-[360px]">
                <ButtonLink to="/locataire" variant="dark" size="lg" className="w-full">
                  Retour à l'accueil
                </ButtonLink>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
