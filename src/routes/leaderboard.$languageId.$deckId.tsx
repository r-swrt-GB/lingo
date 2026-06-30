import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getDeck, getLeaderboard } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/leaderboard/$languageId/$deckId")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: LeaderboardPage,
});

function LeaderboardPage() {
  return (
    <RequireAuth>
      <LeaderboardInner />
    </RequireAuth>
  );
}

const medalColor = ["text-[#f5c518]", "text-[#b8b8b8]", "text-[#cd7f32]"];

function LeaderboardInner() {
  const { languageId, deckId } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: deck } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => getDeck(deckId),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["leaderboard", deckId],
    queryFn: () => getLeaderboard(deckId),
  });

  if (!deck && !isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <button
          onClick={() => navigate({ to: "/language/$languageId", params: { languageId } })}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] px-5 pt-8 pb-16">
        <Link
          to="/language/$languageId"
          params={{ languageId }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Leaderboard</div>
          <h1 className="text-3xl font-bold tracking-tight">{deck?.name ?? "…"}</h1>
        </header>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card h-[52px] animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Trophy className="w-6 h-6 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No scores yet. Be the first to play!</p>
            <Link
              to="/play/$languageId/$deckId"
              params={{ languageId, deckId }}
              search={{ mode: "full" }}
              className="inline-block mt-4 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
            >
              Play now
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isMe = entry.userId === userId;
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${
                    isMe ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="w-7 flex items-center justify-center shrink-0">
                    {i < 3 ? (
                      <Medal className={`w-5 h-5 ${medalColor[i]}`} />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">
                      {entry.name}
                      {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                    </span>
                  </div>
                  <div className="text-lg font-bold tabular-nums shrink-0">{entry.score}</div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
