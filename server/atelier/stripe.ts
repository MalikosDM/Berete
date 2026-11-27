/*
 * Stripe, for the payments of The Private Atelier (27/11/2026). The card never passes through this server: the client pays
 * on the page hosted by Stripe (Checkout, 3-D Secure), and a payment is confirmed ONLY by the signed notification of Stripe
 * (the webhook: /api/stripe/webhook), checked and processed once. The amounts are computed here (server/atelier/money.ts).
 *   STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET   typed by Malik on the VPS (npm run vps -- set …)
 * Without the three, the payment is hidden on the site (« Contact BERETE to confirm your commission »).
 * STRIPE_API_HOST / STRIPE_API_PORT: the tests only, on the Mac (a local stand-in of Stripe, tests/support/fake-stripe.mjs);
 * refused with a live key.
 */
import Stripe from "stripe";

let client: Stripe | null | undefined;

export function stripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key) return (client = null);
  const host = process.env.STRIPE_API_HOST?.trim();
  if (host && !key.startsWith("sk_live_")) {
    client = new Stripe(key, { host, port: Number(process.env.STRIPE_API_PORT || 80), protocol: "http", maxNetworkRetries: 0 });
  } else {
    client = new Stripe(key, { maxNetworkRetries: 2 });
  }
  return client;
}

/** The three keys are there: the payment can be offered. */
export function stripeKeys(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim() && process.env.STRIPE_PUBLISHABLE_KEY?.trim());
}

/** Test keys (sk_test_…): the payment page says that no real money moves. */
export function stripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

export function webhookEvent(body: Buffer, signature: string): Stripe.Event | null {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!s || !secret || !signature) return null;
  try {
    return s.webhooks.constructEvent(body, signature, secret);
  } catch {
    return null;
  }
}

export type CheckoutInput = {
  paymentId: string;
  projectId: string;
  amountCents: number;
  currency: string;
  label: string;
  email: string | null;
  successUrl: string;
  cancelUrl: string;
  /** The means allowed in the admin besides the card (Apple Pay and Google Pay come with the card): "bank_transfer". */
  methods: string[];
};

export async function createCheckout(input: CheckoutInput): Promise<{ id: string; url: string }> {
  const s = stripe();
  if (!s) throw new Error("stripe-off");
  const bank = input.methods.includes("bank_transfer") && input.currency.toUpperCase() === "EUR";
  // A bank transfer goes through the balance of a customer of Stripe (its own account number for this customer).
  const customer = bank && input.email ? (await s.customers.create({ email: input.email, metadata: { projectId: input.projectId } }, { idempotencyKey: "customer-" + input.paymentId })).id : undefined;
  const session = await s.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: input.currency.toLowerCase(), unit_amount: input.amountCents, product_data: { name: input.label } } }],
      ...(customer ? { customer } : input.email ? { customer_email: input.email } : {}),
      // The card (with Apple Pay and Google Pay); a bank transfer too when Berete allowed it in the admin.
      allowed_payment_method_types: bank && customer ? ["card", "customer_balance"] : ["card"],
      ...(bank && customer ? { payment_method_options: { customer_balance: { funding_type: "bank_transfer", bank_transfer: { type: "eu_bank_transfer", eu_bank_transfer: { country: "FR" } } } } } : {}),
      metadata: { paymentId: input.paymentId, projectId: input.projectId },
      payment_intent_data: { metadata: { paymentId: input.paymentId, projectId: input.projectId }, description: input.label },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    },
    { idempotencyKey: "checkout-" + input.paymentId },
  );
  if (!session.url) throw new Error("stripe-no-url");
  return { id: session.id, url: session.url };
}
