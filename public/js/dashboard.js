import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const logoutBtn = document.getElementById("logout-btn");
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const dashStatus = document.getElementById("dash-status");
const upgradeBtn = document.getElementById("upgrade-btn");

function showStatus(el, msg, ok) {
  el.textContent = msg;
  el.className = `status-msg show ${ok ? "ok" : "err"}`;
}

async function init() {
  const configRes = await fetch("/api/public-config");
  const config = await configRes.json();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    showStatus(loginStatus, "The dashboard isn't configured yet. Contact us to finish setup.", false);
    return;
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

  async function renderDashboard(session) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");

    const { data: contractor, error: contractorErr } = await supabase
      .from("contractors")
      .select("*")
      .eq("email", session.user.email)
      .maybeSingle();

    if (contractorErr || !contractor) {
      showStatus(dashStatus, "We couldn't find a contractor account for this email. Apply to join the network first.", false);
      return;
    }

    document.getElementById("company-name").textContent = contractor.company_name;
    const tierTag = document.getElementById("tier-tag");
    tierTag.textContent = contractor.tier === "premium" ? "Premium Installer" : "Free Network Member";
    tierTag.className = `tier-tag ${contractor.tier}`;

    if (contractor.tier === "premium") {
      upgradeBtn.classList.add("hidden");
    } else if (contractor.status !== "approved") {
      upgradeBtn.classList.add("hidden");
      showStatus(dashStatus, "Your application is still pending approval — you'll start receiving leads once approved.", true);
    }

    upgradeBtn.addEventListener("click", async () => {
      upgradeBtn.disabled = true;
      upgradeBtn.textContent = "Loading…";
      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong.");
        window.location.href = data.url;
      } catch (err) {
        showStatus(dashStatus, err.message, false);
        upgradeBtn.disabled = false;
        upgradeBtn.textContent = "Upgrade To Premium";
      }
    });

    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("*")
      .eq("matched_contractor_id", contractor.id)
      .order("created_at", { ascending: false });

    const tbody = document.getElementById("leads-body");
    tbody.textContent = "";

    if (leadsErr) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.className = "muted";
      cell.textContent = "Couldn't load leads right now.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    if (!leads || leads.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.className = "muted";
      cell.textContent = "No leads yet — they'll show up here as homeowners get matched to you.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    for (const lead of leads) {
      const row = document.createElement("tr");
      const cells = [
        new Date(lead.created_at).toLocaleDateString(),
        lead.full_name,
        `${lead.phone} · ${lead.email}`,
        `${lead.city ? lead.city + ", " : ""}${lead.state} ${lead.zip}`,
        lead.garage_size,
        `$${lead.price_low.toLocaleString()}–$${lead.price_high.toLocaleString()}`,
        lead.timeline,
      ];
      for (const value of cells) {
        const td = document.createElement("td");
        td.textContent = value;
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    renderDashboard(session);
  }

  supabase.auth.onAuthStateChange((_event, newSession) => {
    if (newSession) renderDashboard(newSession);
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const submitBtn = loginForm.querySelector("[data-submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Login Link";
    if (error) {
      showStatus(loginStatus, error.message, false);
    } else {
      showStatus(loginStatus, "Check your email for a login link.", true);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
}

init();
