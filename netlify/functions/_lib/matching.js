const { getSupabase } = require("./supabase");

const DEMO_CONTRACTOR = {
  id: "demo-contractor",
  company_name: "Ozarks Concrete Coatings",
  contact_name: "Demo Pro",
  email: "demo@example.com",
  phone: "(555) 010-0100",
  city: "Springfield",
  state: "MO",
  tier: "premium",
};

// Finds the best contractor for a lead's state: premium contractors first
// (round-robin by last_matched_at so leads spread across the market's paid slots),
// falling back to any approved free contractor, then null if the state has no coverage yet.
async function matchContractor(state) {
  const supabase = getSupabase();
  if (!supabase) {
    return { contractor: DEMO_CONTRACTOR, matchTier: "premium" };
  }

  const { data: premium, error: premiumErr } = await supabase
    .from("contractors")
    .select("*")
    .eq("state", state)
    .eq("tier", "premium")
    .eq("status", "approved")
    .order("last_matched_at", { ascending: true, nullsFirst: true })
    .limit(1);

  if (premiumErr) throw premiumErr;

  if (premium && premium.length > 0) {
    const match = premium[0];
    await supabase.from("contractors").update({ last_matched_at: new Date().toISOString() }).eq("id", match.id);
    return { contractor: match, matchTier: "premium" };
  }

  const { data: free, error: freeErr } = await supabase
    .from("contractors")
    .select("*")
    .eq("state", state)
    .eq("tier", "free")
    .eq("status", "approved")
    .order("last_matched_at", { ascending: true, nullsFirst: true })
    .limit(1);

  if (freeErr) throw freeErr;

  if (free && free.length > 0) {
    const match = free[0];
    await supabase.from("contractors").update({ last_matched_at: new Date().toISOString() }).eq("id", match.id);
    return { contractor: match, matchTier: "free" };
  }

  return { contractor: null, matchTier: "unmatched" };
}

module.exports = { matchContractor };
