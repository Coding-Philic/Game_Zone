import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const validUrl =
    url && url.startsWith("http") && !url.includes("your_supabase_url")
      ? url
      : "https://placeholder-project.supabase.co";

  const validKey = key && key.length > 10 ? key : "dummy-anon-key";

  return createBrowserClient(validUrl, validKey);
}

