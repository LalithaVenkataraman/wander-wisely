import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { LogoWordmark } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Wandr — sign in" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    setBusy(true);
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setErr(result.error.message ?? "Sign in failed");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="px-8 pt-8">
        <LogoWordmark size={52} className="text-2xl gap-2" />
      </header>
      <section className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-3xl mb-2">
            <span className="text-black">Sign in to</span>{" "}
            <span className="font-serif-italic text-accent">Wandr</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Save every trip you plan and help train Wandr by rating what it suggests.
          </p>
          <button
            onClick={signIn}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 border border-border rounded-full py-3 hover:bg-gray-50 transition disabled:opacity-60 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 34.9 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8L6.1 32.6C9.5 39.5 16.1 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40 35.4 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            {busy ? "Redirecting…" : "Continue with Google"}
          </button>
          {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
          <p className="mt-6 text-xs text-muted-foreground">
            You can keep planning without signing in — trips only save once you're in.
          </p>
        </div>
      </section>
    </main>
  );
}