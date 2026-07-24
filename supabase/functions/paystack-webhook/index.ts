import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

Deno.serve(async (req: Request) => {
  // ── 1. Read raw body BEFORE any parsing ──────────────────────────────────────
  // Must be raw text. Parsing first changes whitespace → HMAC won't match.
  const rawBody = await req.text();

  // ── 2. Verify Paystack signature (HMAC-SHA512, header x-paystack-signature) ──
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const expected = createHmac("sha512", Deno.env.get("PAYSTACK_SECRET_KEY")!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expected) {
    return new Response("Invalid signature", { status: 401 });
  }

  // ── 3. Parse event ────────────────────────────────────────────────────────────
  const event = JSON.parse(rawBody);
  const eventType: string = event.event;

  // ── 4. Extract idempotency key per event type ─────────────────────────────────
  let idempotencyRef: string;
  if (eventType === "charge.success") {
    idempotencyRef = event.data.reference;
  } else if (eventType === "subscription.disable") {
    idempotencyRef = event.data.subscription_code;
  } else {
    // Unknown event — acknowledge and ignore
    return new Response("OK", { status: 200 });
  }

  // ── 5. Idempotency gate ───────────────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // bypasses RLS
  );

  const { error: insertErr } = await supabase
    .from("webhook_events")
    .insert({ event_type: eventType, paystack_ref: idempotencyRef });

  if (insertErr?.code === "23505") {
    // Unique constraint violation — already processed. Acknowledge and stop.
    return new Response("OK", { status: 200 });
  }
  if (insertErr) {
    // Genuine DB error — return 500 so Paystack retries delivery later
    console.error("webhook_events insert failed:", insertErr);
    return new Response("Internal error", { status: 500 });
  }

  // ── 6. Process event ──────────────────────────────────────────────────────────
  if (eventType === "charge.success") {
    const userId: string | undefined = event.data.metadata?.user_id;
    if (!userId) {
      // Can't process without user_id — log and ack (don't 500, don't retry)
      console.error(
        "charge.success missing metadata.user_id, ref:",
        event.data.reference
      );
      return new Response("OK", { status: 200 });
    }

    // current_period_end = paid_at + 30 days
    const paidAt = new Date(event.data.paid_at);
    const periodEnd = new Date(paidAt);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { error: upsertErr } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          status: "active",
          paystack_customer_code: event.data.customer.customer_code,
          paystack_subscription_code: event.data.subscription_code ?? null,
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error("subscriptions upsert failed:", upsertErr);
      return new Response("Internal error", { status: 500 });
    }
  }

  if (eventType === "subscription.disable") {
    // Set status = 'cancelled'; current_period_end unchanged — access expires naturally
    const { error: updateErr } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("paystack_customer_code", event.data.customer.customer_code);

    if (updateErr) {
      console.error("subscriptions update failed:", updateErr);
      return new Response("Internal error", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
});
