document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  if (!form) return;

  const errorEl = form.querySelector(".q-error");
  const statusEl = document.getElementById("status-msg");
  const submitBtn = form.querySelector("[data-submit]");

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add("show");
  }
  function showStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.className = `status-msg show ${ok ? "ok" : "err"}`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.remove("show");
    statusEl.classList.remove("show");

    const companyName = form.querySelector("#companyName").value.trim();
    const contactName = form.querySelector("#contactName").value.trim();
    const phone = form.querySelector("#phone").value.trim();
    const email = form.querySelector("#email").value.trim();
    const city = form.querySelector("#city").value.trim();
    const state = form.querySelector("#state").value;
    const serviceRadiusMiles = form.querySelector("#serviceRadiusMiles").value.trim();
    const yearsInBusiness = form.querySelector("#yearsInBusiness").value.trim();
    const licenseNumber = form.querySelector("#licenseNumber").value.trim();
    const website = form.querySelector("#website").value.trim();
    const insured = form.querySelector("#insured").checked;

    if (!companyName || !contactName || !email || !phone || !city || !state) {
      return showError("Please fill out all required fields.");
    }
    if (!insured) {
      return showError("You must confirm you carry liability insurance to join the network.");
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Submitting…`;

    try {
      const res = await fetch("/api/contractor-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName, contactName, phone, email, city, state,
          serviceRadiusMiles, yearsInBusiness, licenseNumber, website, insured,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      form.reset();
      showStatus("Application received! Check your email — we'll follow up within 1-2 business days.", true);
    } catch (err) {
      showStatus(err.message, false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Application";
    }
  });
});
