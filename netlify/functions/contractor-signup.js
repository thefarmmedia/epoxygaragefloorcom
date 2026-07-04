const { getSupabase } = require("./_lib/supabase");
const { validateContractor } = require("./_lib/validate");
const { sendEmail } = require("./_lib/email");

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

  const { errors, value } = validateContractor(body);
  if (errors.length) {
    return { statusCode: 400, body: JSON.stringify({ error: errors.join(" ") }) };
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data: existing } = await supabase
        .from("contractors")
        .select("id")
        .eq("email", value.email)
        .maybeSingle();
      if (existing) {
        return { statusCode: 409, body: JSON.stringify({ error: "This email is already registered in our network." }) };
      }

      const { error: insertErr } = await supabase.from("contractors").insert({
        company_name: value.companyName,
        contact_name: value.contactName,
        email: value.email,
        phone: value.phone,
        city: value.city,
        state: value.state,
        service_states: value.serviceStates,
        service_radius_miles: value.serviceRadiusMiles,
        years_in_business: value.yearsInBusiness,
        license_number: value.licenseNumber || null,
        insured: value.insured,
        website: value.website || null,
        notes: value.notes || null,
        tier: "free",
        status: "pending",
      });
      if (insertErr) throw insertErr;
    }

    await sendEmail({
      to: value.email,
      subject: "You're in — EpoxyGarageFloors.ai network application received",
      html: `
        <h2>Thanks for applying, ${value.contactName}!</h2>
        <p>We received your application for <strong>${value.companyName}</strong>. Our team reviews
        every applicant (license/insurance check) before you go live — expect a decision within 1-2
        business days.</p>
        <p>Once approved you'll start receiving free-tier leads in ${value.state}, and can upgrade to
        a Premium spot any time to get top placement and priority leads in your market.</p>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong. Please try again." }) };
  }
};
