const { getSupabase } = require("./supabase");

// Verifies the caller's Supabase access token and returns their contractor row.
// Prevents one contractor from acting on another contractor's account.
async function getContractorFromRequest(event) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData || !userData.user || !userData.user.email) return null;

  const { data: contractor, error: contractorErr } = await supabase
    .from("contractors")
    .select("*")
    .eq("email", userData.user.email)
    .maybeSingle();
  if (contractorErr) throw contractorErr;

  return contractor;
}

module.exports = { getContractorFromRequest };
