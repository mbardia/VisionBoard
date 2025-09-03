// src/pages/auth/callback.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // For PKCE/code flow redirects (?code=...), exchange for a session:
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          // Not all flows require exchange; ignore and continue.
          // You can show a message if you prefer.
        }
      } finally {
        router.replace("/dashboard");
      }
    })();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border p-6">Signing you in…</div>
    </main>
  );
}
