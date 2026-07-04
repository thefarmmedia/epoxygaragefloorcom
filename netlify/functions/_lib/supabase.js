const { createClient } = require("@supabase/supabase-js");

let client = null;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null; // demo mode — caller falls back to mock behavior
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

module.exports = { getSupabase };
