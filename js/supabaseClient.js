import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://lsyvkxxrvawxvgqulznv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_10QfaRwyEr9MDwUpmKrdKQ_sF4sjkfa";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
