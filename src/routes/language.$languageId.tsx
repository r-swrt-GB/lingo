import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Layers, Pencil, Play, Plus, Settings, Trash2, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDeck, deleteDeck, getDecks, getLanguage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/language/$languageId")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: LanguagePage,
});

function LanguagePage() {
  return (
    <RequireAuth>
      <LanguagePageInner />
    </RequireAuth>
  );
}

function LanguagePageInner() {
  const { languageId } = Route.useParams();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");

  const { data: lang, isLoading: langLoading } = useQuery({
    queryKey: ["language", languageId],
    queryFn: () => getLanguage(languageId),
  });

  const { data: decks = [], isLoading: decksLoading } = useQuery({
    queryKey: ["decks", languageId],
    queryFn: () => getDecks(languageId),
  });

  const addDeckMutation = useMutation({
    mutationFn: (name: string) => addDeck(languageId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks", languageId] });
      setNewDeckName("");
      setAdding(false);
    },
  });

  const deleteDeckMutation = useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["decks", languageId] }),
  });

  const isLoading = langLoading || decksLoading;
  const canEdit = lang?.myRole === "owner" || lang?.myRole === "editor";

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!lang) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Language not found.</p>
          <Link to="/" className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    addDeckMutation.mutate(newDeckName);
  };

  return (
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] px-5 pt-8 pb-32">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{lang.name}</h1>
            {lang.myRole === "owner" && (
              <Link
                to="/edit/$languageId"
                params={{ languageId }}
                className="text-muted-foreground hover:text-foreground p-1 shrink-0"
                aria-label="Manage members"
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 italic">
            Created by {lang.createdBy}
            {!lang.isPublic && " · Private"}
          </p>
        </header>

        {decks.length === 0 && !adding && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center mb-6">
            <Layers className="w-6 h-6 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {canEdit ? "No decks yet. Create one below." : "No decks have been created yet."}
            </p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <AnimatePresence initial={false}>
            {decks.map((deck) => {
              const canPlay = deck.wordCount >= 4;
              return (
                <motion.div
                  key={deck.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold truncate">{deck.name}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {deck.wordCount} {deck.wordCount === 1 ? "word" : "words"}
                        {deck.myHighScore > 0 && ` · Best ${deck.myHighScore}`}
                      </p>
                      {!canPlay && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Add at least 4 words to play
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Link
                        to="/leaderboard/$languageId/$deckId"
                        params={{ languageId, deckId: deck.id }}
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label="Leaderboard"
                      >
                        <Trophy className="w-4 h-4" />
                      </Link>
                      {canEdit && (
                        <Link
                          to="/deck/$languageId/$deckId"
                          params={{ languageId, deckId: deck.id }}
                          className="text-muted-foreground hover:text-foreground p-1"
                          aria-label="Edit deck"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${deck.name}"?`)) deleteDeckMutation.mutate(deck.id);
                          }}
                          className="text-muted-foreground hover:text-foreground p-1"
                          aria-label="Delete deck"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    {canPlay ? (
                      <Link
                        to="/play/$languageId/$deckId"
                        params={{ languageId, deckId: deck.id }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 active:scale-[0.98] transition-transform"
                      >
                        <Play className="w-4 h-4" /> Play
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium py-2.5 cursor-not-allowed"
                      >
                        <Play className="w-4 h-4" /> Play
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {canEdit && (
          <AnimatePresence mode="wait">
            {adding ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onSubmit={submit}
                className="rounded-xl border border-border bg-card p-3 space-y-2"
              >
                <input
                  autoFocus
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Deck name (e.g. Chapter 1, Verbs)"
                  className="w-full bg-transparent text-base outline-none px-2 py-2 placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setNewDeckName("");
                    }}
                    className="flex-1 rounded-lg border border-border text-sm font-medium py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addDeckMutation.isPending}
                    className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 disabled:opacity-50"
                  >
                    {addDeckMutation.isPending ? "Creating…" : "Create"}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.button
                key="btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium py-3.5 active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" /> New deck
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
