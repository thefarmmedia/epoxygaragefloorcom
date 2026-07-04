// Exposes only public-safe values to the browser (Supabase anon key + RLS
// enforce access control — this is not a secret, same as any client-side SDK key).
exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { "Cache-Control": "public, max-age=300" },
    body: JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
    }),
  };
};
