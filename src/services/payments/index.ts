import { createHttpGateway } from "./httpGateway";
import { createMockInTouchGateway } from "./mockInTouch";
import type { PaymentGateway } from "./types";

export * from "./types";

const mode = import.meta.env.VITE_PAYMENT_GATEWAY ?? "mock";

export const paymentGateway: PaymentGateway =
  mode === "http" ? createHttpGateway(import.meta.env.VITE_API_URL ?? "/api") : createMockInTouchGateway();
