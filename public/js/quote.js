document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".q-step"));
  const progressFill = form.querySelector(".progress-fill");
  const stepCountEl = form.querySelector(".step-count");
  const errorEl = form.querySelector(".q-error");
  const total = steps.length;

  const state = {
    zip: "", city: "", state_: "",
    garageSize: "", floorCondition: "", coatingInterest: "", timeline: "",
    fullName: "", email: "", phone: "",
  };

  let current = 0;

  function showStep(index) {
    steps.forEach((el, i) => el.classList.toggle("active", i === index));
    progressFill.style.width = `${((index + 1) / total) * 100}%`;
    stepCountEl.textContent = `Step ${Math.min(index + 1, total)} of ${total}`;
    hideError();
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add("show");
  }
  function hideError() {
    errorEl.classList.remove("show");
  }

  function validateCurrentStep() {
    const stepEl = steps[current];
    const key = stepEl.dataset.step;

    if (key === "location") {
      const zip = form.querySelector("#zip").value.trim();
      const st = form.querySelector("#state").value;
      if (!/^\d{5}$/.test(zip)) return "Please enter a valid 5-digit ZIP code.";
      if (!st) return "Please select your state.";
      state.zip = zip;
      state.city = form.querySelector("#city").value.trim();
      state.state_ = st;
      return null;
    }
    if (key === "size" && !state.garageSize) return "Please select your garage size.";
    if (key === "condition" && !state.floorCondition) return "Please select your floor's current condition.";
    if (key === "coating" && !state.coatingInterest) return "Please select a coating style.";
    if (key === "timeline") {
      if (!state.timeline) return "Please select a timeline.";
      // compute + render price on the reveal step right after this one
      renderPrice();
    }
    if (key === "contact") {
      const fullName = form.querySelector("#fullName").value.trim();
      const email = form.querySelector("#email").value.trim();
      const phone = form.querySelector("#phone").value.trim();
      if (!fullName) return "Please enter your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email.";
      if (phone.replace(/\D/g, "").length < 10) return "Please enter a valid phone number.";
      state.fullName = fullName;
      state.email = email;
      state.phone = phone;
    }
    return null;
  }

  function renderPrice() {
    const { low, high } = window.EGF_PRICING.calc({
      size: state.garageSize,
      coating: state.coatingInterest,
      condition: state.floorCondition,
    });
    state.priceLow = low;
    state.priceHigh = high;
    const target = form.querySelector("#price-amount");
    if (target) target.textContent = `${window.EGF_PRICING.formatUSD(low)} – ${window.EGF_PRICING.formatUSD(high)}`;
  }

  form.querySelectorAll(".option-card[data-group]").forEach((card) => {
    card.addEventListener("click", () => {
      const group = card.dataset.group;
      const value = card.dataset.value;
      form.querySelectorAll(`.option-card[data-group="${group}"]`).forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      if (group === "garageSize") state.garageSize = value;
      if (group === "floorCondition") state.floorCondition = value;
      if (group === "coatingInterest") state.coatingInterest = value;
      if (group === "timeline") state.timeline = value;
      hideError();
    });
  });

  form.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const err = validateCurrentStep();
      if (err) return showError(err);
      if (current < total - 1) {
        current += 1;
        showStep(current);
      }
    });
  });

  form.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (current > 0) {
        current -= 1;
        showStep(current);
      }
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = validateCurrentStep();
    if (err) return showError(err);

    const submitBtn = form.querySelector("[data-submit]");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Matching you with a pro…`;

    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: state.fullName,
          email: state.email,
          phone: state.phone,
          zip: state.zip,
          city: state.city,
          state: state.state_,
          garageSize: state.garageSize,
          floorCondition: state.floorCondition,
          coatingInterest: state.coatingInterest,
          timeline: state.timeline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      const params = new URLSearchParams({
        low: data.priceLow,
        high: data.priceHigh,
        name: state.fullName.split(" ")[0] || "",
      });
      if (data.matched) {
        params.set("company", data.matched.companyName);
        params.set("city", data.matched.city || "");
        params.set("state", data.matched.state || "");
      }
      window.location.href = `/thank-you/?${params.toString()}`;
    } catch (err2) {
      showError(err2.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Get Matched With a Certified Pro";
    }
  });

  showStep(0);
});
