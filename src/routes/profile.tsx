import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateUsername } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/profile")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  );
}

function ProfileInner() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setUsername(profile.username);
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (name: string) => updateUsername(name),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e: Error) => {
      setSaved(false);
      setError(e.message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    mutation.mutate(trimmed);
  };

  const dirty = !!profile && username.trim() !== profile.username;

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] px-5 pt-8 pb-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Account</div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        </header>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setSaved(false);
                setError(null);
              }}
              minLength={2}
              maxLength={20}
              placeholder="Username"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-foreground transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
            <input
              value={profile?.email ?? ""}
              disabled
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-base text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">Your email address can't be changed.</p>
          </div>

          {error && <p className="text-sm text-[color:var(--color-error)]">{error}</p>}
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-[color:var(--color-success)]">
              <Check className="w-4 h-4" /> Saved
            </p>
          )}

          <button
            type="submit"
            disabled={!dirty || mutation.isPending}
            className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
