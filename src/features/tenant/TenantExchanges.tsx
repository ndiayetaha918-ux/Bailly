import { Drop, Lightning, Key, CloudRain, Snowflake, Buildings, DotsThree, Camera, Check, Wrench } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { UnitJournal } from "@/components/journal/UnitJournal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Overlay";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { toast } from "@/components/ui/Toast";
import { useData } from "@/hooks/useData";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useStore } from "@/store/store";
import { DEMO_TENANT_ID } from "@/data/seed";
import { contactFor } from "@/domain/selectors";
import { claimCategoryLabel, claimStatusLabel, unitTitle } from "@/domain/labels";
import type { ClaimCategory, Priority } from "@/domain/types";
import { dateShort, time } from "@/lib/format";
import { cn } from "@/lib/cn";

const CATEGORIES: Array<{ v: ClaimCategory; icon: React.ReactNode }> = [
  { v: "plomberie", icon: <Drop size={22} /> },
  { v: "electricite", icon: <Lightning size={22} /> },
  { v: "serrurerie", icon: <Key size={22} /> },
  { v: "humidite", icon: <CloudRain size={22} /> },
  { v: "climatisation", icon: <Snowflake size={22} /> },
  { v: "parties_communes", icon: <Buildings size={22} /> },
  { v: "autre", icon: <DotsThree size={22} /> },
];

export function TenantExchanges() {
  const d = useData();
  const [params, setParams] = useSearchParams();
  const startThread = useStore((s) => s.startThread);
  const unit = d.units.find((u) => u.tenantId === DEMO_TENANT_ID)!;
  const property = d.properties.find((p) => p.id === unit.propertyId)!;
  const contact = contactFor(d, unit);
  const claims = d.threads.filter((t) => t.unitId === unit.id && t.kind === "claim").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const mobile = !useMediaQuery("(min-width: 768px)");

  const [open, setOpen] = useState(params.get("nouveau") === "reclamation");
  const [category, setCategory] = useState<ClaimCategory | null>(null);
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState<Priority>("normal");
  const [photo, setPhoto] = useState(false);
  const [focus, setFocus] = useState<string | undefined>();

  useEffect(() => {
    if (params.get("nouveau")) {
      params.delete("nouveau");
      setParams(params, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (!category || !text.trim()) return;
    const subject = text
      .trim()
      .split(/[.!?\n]/)[0]!
      .slice(0, 60);
    const id = startThread({
      unitId: unit.id,
      kind: "claim",
      subject,
      body: text.trim(),
      authorId: DEMO_TENANT_ID,
      role: "tenant",
      category,
      priority: urgency,
      attachments: photo ? [{ name: "photo.jpg", kind: "photo", tone: "#7c8f86" }] : undefined,
    });
    setFocus(id);
    setOpen(false);
    setCategory(null);
    setText("");
    setPhoto(false);
    setUrgency("normal");
    toast("Réclamation envoyée", `${contact.name} est prévenu.`);
  };

  return (
    <main className="mx-auto max-w-[1080px] px-4 pb-6 pt-6 md:px-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={contact.name} size={44} />
          <div>
            <h1 className="type-display text-[26px] font-semibold leading-tight">{contact.name}</h1>
            <p className="text-[13px] text-ink-3">
              {contact.role === "manager" ? `Gestionnaire, ${contact.org}` : "Propriétaire"}, pour {unitTitle(unit.kind, unit.code).toLowerCase()}
            </p>
          </div>
        </div>
        <Button variant="dark" icon={<Wrench size={16} />} onClick={() => setOpen(true)}>
          Signaler un problème
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_300px]">
        <Panel className="flex h-[calc(100dvh-250px)] min-h-[480px] flex-col overflow-hidden md:h-[640px]">
          <UnitJournal unitId={unit.id} viewer="tenant" viewerId={DEMO_TENANT_ID} initialThreadId={focus} hideFilters />
        </Panel>
        <aside className="grid content-start gap-3">
          <p className="text-[13px] font-medium text-ink-3">Vos réclamations</p>
          {claims.length === 0 && <p className="text-[13.5px] text-ink-3">Aucune pour l'instant.</p>}
          {claims.map((c) => (
            <button key={c.id} onClick={() => setFocus(c.id)} className="text-left">
              <Panel className={cn("p-4 transition-colors hover:border-line-strong", focus === c.id && "border-emerald")}>
                <p className="text-[12px] text-ink-3">{c.category ? claimCategoryLabel[c.category] : "Réclamation"}</p>
                <p className="mt-0.5 text-[14px] font-medium leading-snug">{c.subject}</p>
                <p className={cn("mt-2 text-[12.5px]", c.status === "resolved" ? "text-emerald" : "text-ink-2")}>
                  {c.status === "scheduled" && c.scheduledFor
                    ? `Passage le ${dateShort(c.scheduledFor)} à ${time(c.scheduledFor)}`
                    : claimStatusLabel[c.status!]}
                </p>
              </Panel>
            </button>
          ))}
          <p className="mt-2 text-[12.5px] text-ink-3">
            {property.name}, {property.address}
          </p>
        </aside>
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Signaler un problème"
        description="Votre gestionnaire reçoit la demande avec le local concerné."
        side={mobile ? "bottom" : "right"}
        width={520}
      >
        <div className="grid gap-6 p-6">
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-2">De quoi s'agit-il ?</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c.v}
                  onClick={() => setCategory(c.v)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-[14px] border px-2 py-3 text-[12px] font-medium transition-colors",
                    category === c.v ? "border-emerald bg-mint-soft text-mint-ink" : "border-line text-ink-2 hover:border-line-strong",
                  )}
                >
                  {c.icon}
                  <span className="text-center leading-tight">{claimCategoryLabel[c.v]}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label="Décrivez le problème" hint="Où, depuis quand, ce que vous avez déjà fait.">
            {(id) => (
              <Textarea
                id={id}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex. La prise du salon ne fonctionne plus depuis ce matin."
              />
            )}
          </Field>
          <button
            onClick={() => setPhoto((v) => !v)}
            className={cn(
              "flex items-center gap-3 rounded-[14px] border border-dashed p-4 text-left text-[14px] transition-colors",
              photo ? "border-emerald bg-mint-soft text-mint-ink" : "border-line-strong text-ink-2 hover:bg-surface-2",
            )}
          >
            {photo ? <Check size={20} weight="bold" /> : <Camera size={20} />}
            {photo ? "Photo ajoutée" : "Ajouter une photo"}
          </button>
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-2">Urgence</p>
            <Segmented
              value={urgency}
              onChange={setUrgency}
              options={[
                { value: "normal", label: "Peut attendre quelques jours" },
                { value: "urgent", label: "Urgent" },
              ]}
            />
          </div>
          <Button variant="primary" size="lg" disabled={!category || !text.trim()} onClick={submit}>
            Envoyer la réclamation
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
