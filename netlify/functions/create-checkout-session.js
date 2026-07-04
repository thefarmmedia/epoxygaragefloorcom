const Stripe = require("stripe");
const { getSupabase } = require("./_lib/supabase");
const { getContractorFromRequest } = require("./_lib/auth");
const { premiumCapForState } = require("./_lib/markets");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!stripeKey || !priceId) {
    return { statusCode: 503, body: JSON.stringify({ error: "Premium upgrades aren't configured yet. Contact us to upgrade." }) };
  }

  try {
    const contractor = await getContractorFromRequest(event);
    if (!contractor) {
      return { statusCode: 401, body: JSON.stringify({ error: "Please log in again." }) };
    }
    if (contractor.tier === "premium") {
      return { statusCode: 400, body: JSON.stringify({ error: "You're already a Premium installer." }) };
    }

    const supabase = getSupabase();
    const { count, error: countErr } = await supabase
      .from("contractors")
      .select("id", { count: "exact", head: true })
      .eq("state", contractor.state)
      .eq("tier", "premium")
      .eq("status", "approved");
    if (countErr) throw countErr;

    const cap = premiumCapForState(contractor.state);
    if ((count || 0) >= cap) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: `All ${cap} Premium spot(s) in ${contractor.state} are currently taken. We'll add you to the waitlist.` }),
      };
    }

    const stripe = new Stripe(stripeKey);
    const siteUrl = process.env.SITE_URL || "https://epoxygaragefloors.ai";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: contractor.email,
      client_reference_id: contractor.id,
      metadata: { contractor_id: contractor.id, state: contractor.state },
      success_url: `${siteUrl}/dashboard/?upgraded=1`,
      cancel_url: `${siteUrl}/dashboard/?upgraded=0`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong starting checkout." }) };
  }
};
