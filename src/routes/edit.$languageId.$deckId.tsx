import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addWordInDeck, deleteWord, getDeck, getDeckWords, getLanguage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { RequireAuth } from "@/components/require-auth";
import { ImportWordsDialog } from "@/components/import-words-dialog";

export const Route = createFileRoute("/edit/$languageId/$deckId")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: EditDeck,
});

function EditDeck() {
  return (
    <RequireAuth>
      <EditDeckInner />
    </RequireAuth>
  );
}

function EditDeckInner() {
  const { languageId, deckId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lang, isLoading: langLoading } = useQuery({
    queryKey: ["language", languageId],
    queryFn: () => getLanguage(languageId),
  });

  const { data: deck, isLoading: deckLoading } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => getDeck(deckId),
  });

  const { data: words = [], isLoading: wordsLoading } = useQuery({
    queryKey: ["deck-words", deckId],
    queryFn: () => getDeckWords(deckId),
  });

  const addWordMutation = useMutation({
    mutationFn: ({ target, english }: { target: string; english: string }) =>
      addWordInDeck(languageId, deckId, target, english),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deck-words", deckId] });
      queryClient.invalidateQueries({ queryKey: ["decks", languageId] });
      queryClient.invalidateQueries({ queryKey: ["language", languageId] });
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: (wordId: string) => deleteWord(wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deck-words", deckId] });
      queryClient.invalidateQueries({ queryKey: ["decks", languageId] });
      queryClient.invalidateQueries({ queryKey: ["language", languageId] });
    },
  });

  const [target, setTarget] = useState("");
  const [english, setEnglish] = useState("");

  const isLoading = langLoading || deckLoading || wordsLoading;

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!lang || !deck) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Deck not found.</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  const canEdit = lang.myRole === "owner" || lang.myRole === "editor";

  if (!canEdit) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="text-center max-w-[320px]">
          <p className="text-sm text-muted-foreground mb-4">You don't have edit access to this deck.</p>
          <Link
            to="/language/$languageId"
            params={{ languageId }}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            View decks
          </Link>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim() || !english.trim()) return;
    addWordMutation.mutate(
      { target, english },
      {
        onSuccess: () => {
          setTarget("");
          setEnglish("");
        },
      },
    );
  };

  return (
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] px-5 pt-8 pb-32">
        <Link
          to="/language/$languageId"
          params={{ languageId }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> {lang.name}
        </Link>

        <header className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Editing deck</div>
          <h1 className="text-3xl font-bold tracking-tight">{deck.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {words.length} {words.length === 1 ? "word" : "words"}
          </p>
        </header>

        <section className="space-y-2 mb-8">
          <AnimatePresence initial={false}>
            {words.map((w) => (
              <motion.div
                key={w.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                  <span className="font-semibold truncate">{w.target}</span>
                  <span className="text-muted-foreground text-xs shrink-0">→</span>
                  <span className="text-sm text-muted-foreground truncate">{w.english}</span>
                </div>
                <button
                  onClick={() => deleteWordMutation.mutate(w.id)}
                  className="text-muted-foreground hover:text-foreground p-1 -m-1 shrink-0"
                  aria-label="Delete word"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {words.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No words yet. Add your first pair below.</p>
            </div>
          )}
        </section>

        <div className="mb-3">
          <ImportWordsDialog
            languageId={languageId}
            deckId={deckId}
            languageName={lang.name}
            existingWords={lang.words ?? []}
            onImported={() => {
              queryClient.invalidateQueries({ queryKey: ["deck-words", deckId] });
              queryClient.invalidateQueries({ queryKey: ["decks", languageId] });
              queryClient.invalidateQueries({ queryKey: ["language", languageId] });
            }}
          />
        </div>

        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-3 space-y-2">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={`Word in ${lang.name}`}
            className="w-full bg-transparent text-base outline-none px-2 py-2 placeholder:text-muted-foreground border-b border-border"
            required
          />
          <input
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            placeholder="English translation"
            className="w-full bg-transparent text-base outline-none px-2 py-2 placeholder:text-muted-foreground"
            required
          />
          <button
            type="submit"
            disabled={addWordMutation.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-medium py-3 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {addWordMutation.isPending ? "Adding…" : "Add word"}
          </button>
        </form>
      </div>
    </div>
  );
}
