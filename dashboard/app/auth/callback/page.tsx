"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError(true);
          setTimeout(() => router.push("/login"), 2000);
        } else {
          router.push("/dashboard");
        }
      });
    } else {
      // Implicit flow fallback: check if session exists from URL hash
      supabase.auth.getSession().then(({ data: { session } }) => {
        router.push(session ? "/dashboard" : "/login");
      });
    }
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-red-600">
          Authentication failed. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Authenticating...</p>
    </div>
  );
}
