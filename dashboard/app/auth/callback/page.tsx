"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: authError }) => {
        if (authError) {
          setError(authError.message);
          setTimeout(() => router.push("/login"), 3000);
        } else {
          router.push("/dashboard");
        }
      });
    } else {
      // Implicit flow: session may be detected from URL hash automatically
      supabase.auth.getSession().then(({ data: { session } }) => {
        router.push(session ? "/dashboard" : "/login");
      });
    }
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-red-600">Authentication failed: {error}</p>
          <p className="mt-2 text-xs text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Authenticating...</p>
    </div>
  );
}
