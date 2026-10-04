import type { InitiatePaymentInput, InitiatePaymentResult, PaymentGateway, PaymentStatusResult } from "./types";

/*
  Production client. Talks to the Bailly API, which owns the InTouch
  credentials, calls InTouch, and updates the payment when InTouch posts its
  callback. See docs/integration-intouch.md for the server side.
*/
export function createHttpGateway(baseUrl: string): PaymentGateway {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Payment API ${res.status}`);
    return (await res.json()) as T;
  }

  return {
    id: "http",
    initiate: (input: InitiatePaymentInput) =>
      call<InitiatePaymentResult>("/payments", {
        method: "POST",
        body: JSON.stringify(input),
        headers: { "Idempotency-Key": input.reference },
      }),
    getStatus: (transactionId: string) => call<PaymentStatusResult>(`/payments/${transactionId}`),
    cancel: async (transactionId: string) => {
      await call(`/payments/${transactionId}/cancel`, { method: "POST" });
    },
  };
}
