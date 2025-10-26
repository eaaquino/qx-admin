import { createClient } from "@refinedev/supabase";

const SUPABASE_URL = "https://audrofjcykiocxdkrsof.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZHJvZmpjeWtpb2N4ZGtyc29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExOTgxODUsImV4cCI6MjA3Njc3NDE4NX0.ZcGCUIZw6KWaLJ5yo6XcuO1quxjAk-_GPMpHlmrQ-vc";

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: "public",
  },
  auth: {
    persistSession: true,
  },
});
