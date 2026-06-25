import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: isBrowser ? localStorage : undefined,
  },
  ...(!isBrowser && {
    realtime: { transport: class {} as never },
  }),
});
