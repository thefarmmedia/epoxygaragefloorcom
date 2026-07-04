const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

const ZIP_RE = /^\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GARAGE_SIZES = new Set(["1car", "2car", "3car", "4car"]);
const CONDITIONS = new Set(["good", "minor", "major"]);
const COATINGS = new Set(["solid", "flake", "metallic", "notsure"]);
const TIMELINES = new Set(["asap", "1-3mo", "3-6mo", "researching"]);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validateLead(body) {
  const errors = [];
  const fullName = String(body.fullName || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 200);
  const phone = String(body.phone || "").trim().slice(0, 30);
  const zip = String(body.zip || "").trim();
  const city = String(body.city || "").trim().slice(0, 100);
  const state = String(body.state || "").trim().toUpperCase();
  const garageSize = String(body.garageSize || "");
  const floorCondition = String(body.floorCondition || "");
  const coatingInterest = String(body.coatingInterest || "");
  const timeline = String(body.timeline || "");

  if (!fullName) errors.push("Full name is required.");
  if (!EMAIL_RE.test(email)) errors.push("A valid email is required.");
  if (!phone || phone.replace(/\D/g, "").length < 10) errors.push("A valid phone number is required.");
  if (!ZIP_RE.test(zip)) errors.push("A valid 5-digit ZIP code is required.");
  if (!US_STATES.has(state)) errors.push("A valid US state is required.");
  if (!GARAGE_SIZES.has(garageSize)) errors.push("Garage size is required.");
  if (!CONDITIONS.has(floorCondition)) errors.push("Floor condition is required.");
  if (!COATINGS.has(coatingInterest)) errors.push("Coating preference is required.");
  if (!TIMELINES.has(timeline)) errors.push("Timeline is required.");

  return {
    errors,
    value: { fullName, email, phone, zip, city, state, garageSize, floorCondition, coatingInterest, timeline },
  };
}

function validateContractor(body) {
  const errors = [];
  const companyName = String(body.companyName || "").trim().slice(0, 150);
  const contactName = String(body.contactName || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 200);
  const phone = String(body.phone || "").trim().slice(0, 30);
  const city = String(body.city || "").trim().slice(0, 100);
  const state = String(body.state || "").trim().toUpperCase();
  const serviceRadiusMiles = Number.parseInt(body.serviceRadiusMiles, 10);
  const yearsInBusiness = Number.parseInt(body.yearsInBusiness, 10);
  const licenseNumber = String(body.licenseNumber || "").trim().slice(0, 100);
  const website = String(body.website || "").trim().slice(0, 200);
  const notes = String(body.notes || "").trim().slice(0, 1000);
  const insured = Boolean(body.insured);
  const serviceStates = Array.isArray(body.serviceStates)
    ? body.serviceStates.map((s) => String(s).trim().toUpperCase()).filter((s) => US_STATES.has(s)).slice(0, 51)
    : [];

  if (!companyName) errors.push("Company name is required.");
  if (!contactName) errors.push("Contact name is required.");
  if (!EMAIL_RE.test(email)) errors.push("A valid email is required.");
  if (!phone || phone.replace(/\D/g, "").length < 10) errors.push("A valid phone number is required.");
  if (!city) errors.push("City is required.");
  if (!US_STATES.has(state)) errors.push("A valid home state is required.");
  if (!insured) errors.push("You must confirm you carry liability insurance to join the network.");

  return {
    errors,
    value: {
      companyName, contactName, email, phone, city, state,
      serviceStates: serviceStates.length ? serviceStates : [state],
      serviceRadiusMiles: Number.isFinite(serviceRadiusMiles) ? serviceRadiusMiles : 50,
      yearsInBusiness: Number.isFinite(yearsInBusiness) ? yearsInBusiness : null,
      licenseNumber, website, notes, insured,
    },
  };
}

module.exports = { escapeHtml, validateLead, validateContractor, US_STATES };
