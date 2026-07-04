const { escapeHtml } = require("./validate");

const FROM = process.env.LEADS_FROM_EMAIL || "leads@epoxygaragefloors.ai";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null; // demo mode — emails are logged instead of sent
  const { Resend } = require("resend");
  return new Resend(key);
}

async function sendEmail({ to, subject, html }) {
  const resend = getResend();
  if (!resend) {
    console.log(`[demo email] to=${to} subject="${subject}"`);
    return { demo: true };
  }
  return resend.emails.send({ from: FROM, to, subject, html });
}

function contractorLeadEmail({ contractor, lead }) {
  const name = escapeHtml(lead.full_name);
  const city = escapeHtml(lead.city || "");
  const phone = escapeHtml(lead.phone);
  const email = escapeHtml(lead.email);
  return {
    to: contractor.email,
    subject: `New lead: ${name} in ${city || lead.zip}, ${lead.state}`,
    html: `
      <h2>New epoxy garage floor lead</h2>
      <p><strong>${name}</strong> — ${phone} — ${email}</p>
      <p>${city ? city + ", " : ""}${lead.state} ${escapeHtml(lead.zip)}</p>
      <ul>
        <li>Garage size: ${escapeHtml(lead.garage_size)}</li>
        <li>Floor condition: ${escapeHtml(lead.floor_condition)}</li>
        <li>Coating interest: ${escapeHtml(lead.coating_interest)}</li>
        <li>Timeline: ${escapeHtml(lead.timeline)}</li>
        <li>Estimated range shown to homeowner: $${lead.price_low.toLocaleString()}–$${lead.price_high.toLocaleString()}</li>
      </ul>
      <p>Reach out quickly — homeowners are matched to one pro at a time in your area.</p>
    `,
  };
}

function homeownerConfirmationEmail({ lead, contractor }) {
  const proLine = contractor
    ? `<p><strong>${escapeHtml(contractor.company_name)}</strong> in your area will be reaching out shortly.</p>`
    : `<p>We're lining up a certified installer in your area and will follow up shortly.</p>`;
  return {
    to: lead.email,
    subject: "Your epoxy garage floor price range — EpoxyGarageFloors.ai",
    html: `
      <h2>Thanks, ${escapeHtml(lead.full_name)}!</h2>
      <p>Based on what you told us, your estimated price range is
        <strong>$${lead.price_low.toLocaleString()}–$${lead.price_high.toLocaleString()}</strong>.</p>
      ${proLine}
      <p>This is a ballpark estimate — your certified installer will confirm an exact quote after
      seeing your garage (photos or an in-person visit).</p>
    `,
  };
}

module.exports = { sendEmail, contractorLeadEmail, homeownerConfirmationEmail };
