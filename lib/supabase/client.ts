import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      storage: {
        getItem: (key: string) => {
          if (typeof window === "undefined") return null
          try {
            const item = window.localStorage.getItem(key)
            return item
          } catch {
            return null
          }
        },
        setItem: (key: string, value: string) => {
          if (typeof window === "undefined") return
          try {
            window.localStorage.setItem(key, value)
          } catch {
            // Ignore storage errors
          }
        },
        removeItem: (key: string) => {
          if (typeof window === "undefined") return
          try {
            window.localStorage.removeItem(key)
          } catch {
            // Ignore storage errors
          }
        },
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}
