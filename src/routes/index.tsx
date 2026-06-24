import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Play, Pencil, Trash2, Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addLanguage, deleteLanguage, getLanguages } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flashcards — Learn languages" },
      { name: "description", content: "Mobile-first flashcard quizzes for any language you want to learn." },
    ],
  }),
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();
  const { data: languages = [], isLoading } = useQuery({ queryKey: ["languages"], queryFn: getLanguages });

  const addMutation = useMutation({
    mutationFn: addLanguage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["languages"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLanguage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["languages"] }),
  });

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addMutation.mutate(name, {
      onSuccess: () => {
        setName("");
        setAdding(false);
      },
    });
  };

  return (
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] px-5 pt-10 pb-24">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            <Languages className="w-3.5 h-3.5" />
            Flashcards
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Your languages</h1>
          <p className="text-sm text-muted-foreground mt-1">Tap a card to play or edit.</p>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 h-[112px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {languages.map((lang) => {
                const canPlay = lang.words.length >= 5;
                return (
                  <motion.div
                    key={lang.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold truncate">{lang.name}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lang.words.length} {lang.words.length === 1 ? "word" : "words"} · High {lang.highScore}
                        </p>
                        {!canPlay && (
                          <p className="text-[11px] text-muted-foreground mt-2">Add at least 5 words to play</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${lang.name}"?`)) deleteMutation.mutate(lang.id);
                        }}
                        className="text-muted-foreground hover:text-foreground p-1 -m-1"
                        aria-label="Delete language"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {canPlay ? (
                        <Link
                          to="/play/$languageId"
                          params={{ languageId: lang.id }}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 active:scale-[0.98] transition-transform"
                        >
                          <Play className="w-4 h-4" /> Play
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium py-2.5 cursor-not-allowed"
                        >
                          <Play className="w-4 h-4" /> Play
                        </button>
                      )}
                      <Link
                        to="/edit/$languageId"
                        params={{ languageId: lang.id }}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium py-2.5 active:scale-[0.98] transition-transform"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {languages.length === 0 && !adding && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No languages yet. Add your first one below.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. French, Zulu, Japanese"
                  className="w-full bg-transparent text-base outline-none px-2 py-2 placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAdding(false); setName(""); }}
                    className="flex-1 rounded-lg border border-border text-sm font-medium py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 disabled:opacity-50"
                  >
                    {addMutation.isPending ? "Adding…" : "Add"}
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
                <Plus className="w-4 h-4" /> Add language
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
