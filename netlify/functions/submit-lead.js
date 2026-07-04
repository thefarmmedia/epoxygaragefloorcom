const { getSupabase } = require("./_lib/supabase");
const { calcPriceRange } = require("./_lib/pricing");
const { matchContractor } = require("./_lib/matching");
const { validateLead } = require("./_lib/validate");
const { sendEmail, contractorLeadEmail, homeownerConfirmationEmail } = require("./_lib/email");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body." }) };
  }

  const { errors, value } = validateLead(body);
  if (errors.length) {
    return { statusCode: 400, body: JSON.stringify({ error: errors.join(" ") }) };
  }

  const price = calcPriceRange({
    size: value.garageSize,
    coating: value.coatingInterest,
    condition: value.floorCondition,
  });

  try {
    const { contractor, matchTier } = await matchContractor(value.state);

    const leadRecord = {
      full_name: value.fullName,
      email: value.email,
      phone: value.phone,
      zip: value.zip,
      city: value.city || null,
      state: value.state,
      garage_size: value.garageSize,
      floor_condition: value.floorCondition,
      coating_interest: value.coatingInterest,
      timeline: value.timeline,
      price_low: price.low,
      price_high: price.high,
      matched_contractor_id: contractor && contractor.id !== "demo-contractor" ? contractor.id : null,
      match_tier: matchTier,
    };

    const supabase = getSupabase();
    if (supabase) {
      const { error: insertErr } = await supabase.from("leads").insert(leadRecord);
      if (insertErr) throw insertErr;
    }

    const emailLead = { ...leadRecord };
    const emailTasks = [sendEmail(homeownerConfirmationEmail({ lead: emailLead, contractor }))];
    if (contractor) {
      emailTasks.push(sendEmail(contractorLeadEmail({ contractor, lead: emailLead })));
    }
    await Promise.all(emailTasks).catch((err) => console.error("Email send failed:", err.message));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        priceLow: price.low,
        priceHigh: price.high,
        matched: contractor
          ? { companyName: contractor.company_name, city: contractor.city, state: contractor.state, tier: matchTier }
          : null,
      }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong. Please try again." }) };
  }
};
