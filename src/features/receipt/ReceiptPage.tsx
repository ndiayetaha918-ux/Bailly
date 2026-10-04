import { ArrowLeft, SealCheck } from "@phosphor-icons/react";
import { brand } from "@/brand/brand";
import { motion } from "motion/react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ReceiptDoc } from "@/components/receipt/Receipt";
import { ReceiptActions } from "@/components/receipt/ReceiptActions";
import { Logo } from "@/components/brand/Logo";
import { useData } from "@/hooks/useData";
import { NotFound } from "@/features/NotFound";

export function ReceiptPage() {
  const { receiptId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const d = useData();
  const receipt = d.receipts.find((r) => r.id === receiptId);
  if (!receipt) return <NotFound />;
  const verified = params.get("v") === receipt.verifyCode;

  return (
    <div className="min-h-[100dvh] bg-paper">
      <header className="no-print mx-auto flex h-16 max-w-[1080px] items-center justify-between px-5">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink"
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <Logo />
        <span className="w-14" />
      </header>
      <main className="mx-auto max-w-[620px] px-4 pb-16 pt-4">
        {verified && (
          <p className="no-print mb-4 flex items-center justify-center gap-2 rounded-[14px] bg-mint-soft px-4 py-3 text-[13.5px] font-medium text-mint-ink">
            <SealCheck size={18} weight="fill" /> Quittance authentique, émise par {brand.name}
          </p>
        )}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <ReceiptDoc d={d} receipt={receipt} />
        </motion.div>
        <ReceiptActions receipt={receipt} className="no-print mx-auto mt-6 max-w-[560px]" />
      </main>
    </div>
  );
}
