import { createClient } from "@supabase/supabase-js"
export default createClient(
  "https://khncuismpxnrbztqevcb.supabase.co",
  "sb_publishable_p9hGuErj9-j4x9rigJaCMg_fM-OCE1G",
  {
    auth: {
      experimental: { passkey: true }
    }
  }
)