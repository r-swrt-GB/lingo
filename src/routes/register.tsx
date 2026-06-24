import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/" });
  },
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.session) {
      navigate({ to: "/" });
    } else {
      setVerifyPending(true);
    }
  };

  if (verifyPending) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="w-full max-w-[360px] text-center">
          <img src="/images/logo_with_mascot.png" alt="Lingo" className="h-28 mx-auto mb-14" />
          <h1 className="text-2xl font-bold tracking-tight mb-2">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>. Open it to
            activate your account.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <img src="/images/logo_with_mascot.png" alt="Lingo" className="h-28 mx-auto mb-14" />
        <h1 className="text-3xl font-bold tracking-tight mb-1">Create account</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Already have one?{" "}
          <Link to="/login" className="text-foreground underline underline-offset-2">
            Sign in
          </Link>
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
          />
          {error && <p className="text-sm text-[color:var(--color-error)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
