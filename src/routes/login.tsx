import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Languages } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/" });
  },
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
          <Languages className="w-3.5 h-3.5" />
          Flashcards
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-8">
          No account?{" "}
          <Link to="/register" className="text-foreground underline underline-offset-2">
            Register
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
          />
          {error && <p className="text-sm text-[color:var(--color-error)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
