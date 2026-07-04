// Premium-slot caps per state, sized roughly by market/population.
// This is a starting heuristic (state-level) — swap for metro-level markets
// once there's enough contractor density to justify it.
const LARGE = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI"]; // cap 3
const MEDIUM = [
  "NJ", "VA", "WA", "AZ", "MA", "TN", "IN", "MO", "MD", "WI",
  "CO", "MN", "SC", "AL", "LA", "KY", "OR", "OK", "CT", "UT",
  "IA", "NV", "AR", "MS", "KS",
]; // cap 2
// everything else (ME, MT, NE, NH, NM, ND, RI, SD, VT, WV, WY, ID, HI, AK, DE, DC...) — cap 1

function premiumCapForState(state) {
  if (LARGE.includes(state)) return 3;
  if (MEDIUM.includes(state)) return 2;
  return 1;
}

module.exports = { premiumCapForState };
