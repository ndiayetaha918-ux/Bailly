import { ArrowLeft } from "@phosphor-icons/react";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/brand/Logo";

export function NotFound() {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <LogoMark size={44} lit="var(--pending)" className="mx-auto" />
        <h1 className="type-display mt-6 text-[34px] font-semibold">Cette porte ne mène nulle part</h1>
        <p className="mt-2 text-[15px] text-ink-3">Le local ou la page demandée n'existe pas, ou a été retiré de la démo.</p>
        <ButtonLink to="/" variant="dark" className="mt-6" icon={<ArrowLeft size={16} />}>
          Retour à l'accueil
        </ButtonLink>
      </div>
    </main>
  );
}
