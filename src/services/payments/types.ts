/*
  Payment gateway contract.

  The browser never talks to InTouch directly: merchant credentials must stay
  server-side. In production the app calls our own API (HttpGateway), which
  calls InTouch and receives its callback. For the MVP, MockInTouchGateway
  reproduces the same asynchronous lifecycle in the browser:

      initiate()  ->  PENDING (customer approves on phone)  ->  SUCCESSFUL | FAILED

  Swapping implementations requires no UI change.
*/
import type { MobileMethod } from "@/domain/types";

export type GatewayMethod = MobileMethod | "card";

export type GatewayStatus = "INITIATED" | "PENDING" | "SUCCESSFUL" | "FAILED";

export interface InitiatePaymentInput {
  /** Our own idempotency key / order reference (the invoice id + attempt). */
  reference: string;
  amount: number;
  currency: "XOF";
  method: GatewayMethod;
  /** MSISDN for mobile money, e.g. "+221776542109". */
  payerPhone?: string;
  description: string;
  metadata: { invoiceId: string; unitId: string; tenantId: string };
}

export type NextAction = { type: "approve_on_phone"; message: string } | { type: "redirect"; url: string } | { type: "none" };

export interface InitiatePaymentResult {
  transactionId: string;
  status: GatewayStatus;
  nextAction: NextAction;
}

export interface PaymentStatusResult {
  transactionId: string;
  status: GatewayStatus;
  failureReason?: string;
  settledAt?: string;
}

export interface PaymentGateway {
  readonly id: "mock-intouch" | "http";
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  getStatus(transactionId: string): Promise<PaymentStatusResult>;
  cancel?(transactionId: string): Promise<void>;
}
