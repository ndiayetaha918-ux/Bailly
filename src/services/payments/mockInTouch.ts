import { nowISO } from "@/lib/clock";
import type { GatewayStatus, InitiatePaymentInput, InitiatePaymentResult, PaymentGateway, PaymentStatusResult } from "./types";

/*
  In-browser simulation of an InTouch mobile-money collection.
  - Wave / Orange Money / Free Money: the customer gets a prompt on the
    phone and approves it; we poll until the transaction settles.
  - Demo hooks: a phone number ending in 0000 fails (insufficient balance),
    one ending in 1111 times out on the customer side.
*/

interface MockTx {
  input: InitiatePaymentInput;
  status: GatewayStatus;
  createdAt: number;
  settleAfterMs: number;
  outcome: "success" | "insufficient" | "timeout";
  failureReason?: string;
  settledAt?: string;
}

const approvalCopy: Record<InitiatePaymentInput["method"], string> = {
  wave: "Ouvrez Wave et validez la demande de paiement.",
  orange_money: "Composez #144# ou validez la notification Orange Money avec votre code secret.",
  free_money: "Validez la demande Free Money avec votre code secret.",
  card: "Confirmez le paiement sur la page sécurisée de votre banque.",
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createMockInTouchGateway(opts: { approveAfterMs?: number } = {}): PaymentGateway {
  const txs = new Map<string, MockTx>();
  const approveAfterMs = opts.approveAfterMs ?? 4200;

  return {
    id: "mock-intouch",

    async initiate(input): Promise<InitiatePaymentResult> {
      await wait(700);
      const digits = (input.payerPhone ?? "").replace(/\D/g, "");
      const outcome: MockTx["outcome"] = digits.endsWith("0000") ? "insufficient" : digits.endsWith("1111") ? "timeout" : "success";
      const transactionId = `ITX${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 90 + 10)}`;
      txs.set(transactionId, {
        input,
        status: "PENDING",
        createdAt: Date.now(),
        settleAfterMs: outcome === "timeout" ? 9000 : approveAfterMs,
        outcome,
      });
      return {
        transactionId,
        status: "PENDING",
        nextAction: { type: "approve_on_phone", message: approvalCopy[input.method] },
      };
    },

    async getStatus(transactionId): Promise<PaymentStatusResult> {
      await wait(250);
      const tx = txs.get(transactionId);
      if (!tx) return { transactionId, status: "FAILED", failureReason: "Transaction introuvable" };
      if (tx.status === "PENDING" && Date.now() - tx.createdAt >= tx.settleAfterMs) {
        if (tx.outcome === "success") {
          tx.status = "SUCCESSFUL";
          tx.settledAt = nowISO();
        } else {
          tx.status = "FAILED";
          tx.failureReason =
            tx.outcome === "insufficient"
              ? "Solde insuffisant sur le compte mobile money."
              : "La demande n'a pas été validée à temps sur le téléphone.";
        }
      }
      return { transactionId, status: tx.status, failureReason: tx.failureReason, settledAt: tx.settledAt };
    },

    async cancel(transactionId) {
      const tx = txs.get(transactionId);
      if (tx && tx.status === "PENDING") {
        tx.status = "FAILED";
        tx.failureReason = "Paiement annulé.";
      }
    },
  };
}
