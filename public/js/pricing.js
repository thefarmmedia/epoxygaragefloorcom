// Instant price-range estimator. Ranges are directional (for lead-gen only) —
// certified installers give the firm quote after an in-person/photo assessment.
window.EGF_PRICING = (function () {
  const SIZE_SQFT = {
    "1car": 240,
    "2car": 440,
    "3car": 640,
    "4car": 860,
  };

  const COATING_RATE = {
    solid: [4, 6],
    flake: [6, 9],
    metallic: [9, 14],
    notsure: [5, 9],
  };

  const CONDITION_MULT = {
    good: 1.0,
    minor: 1.08,
    major: 1.18,
  };

  function roundTo(n, step) {
    return Math.round(n / step) * step;
  }

  function calc({ size, coating, condition }) {
    const sqft = SIZE_SQFT[size] || SIZE_SQFT["2car"];
    const [rateLow, rateHigh] = COATING_RATE[coating] || COATING_RATE.notsure;
    const mult = CONDITION_MULT[condition] || 1.0;
    const low = roundTo(sqft * rateLow * mult, 50);
    const high = roundTo(sqft * rateHigh * mult, 50);
    return { low, high, sqft };
  }

  function formatUSD(n) {
    return "$" + n.toLocaleString("en-US");
  }

  return { calc, formatUSD, SIZE_SQFT, COATING_RATE, CONDITION_MULT };
})();
