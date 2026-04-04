const { createClient } = require('@supabase/supabase-js');

let client = null;

function getDB() {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // service_role key — bukan anon key
    );
  }
  return client;
}

module.exports = { getDB };
