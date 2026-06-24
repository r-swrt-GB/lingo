import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addWord, deleteWord, getLanguage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/edit/$languageId")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: EditLanguage,
});

function EditLanguage() {
  const { languageId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lang, isLoading } = useQuery({
    queryKey: ["language", languageId],
    queryFn: () => getLanguage(languageId),
  });

  const addWordMutation = useMutation({
    mutationFn: ({ target, english }: { target: string; english: string }) =>
      addWord(languageId, target, english),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["language", languageId] });
      queryClient.invalidateQueries({ queryKey: ["languages"] });
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: (wordId: string) => deleteWord(wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["language", languageId] });
      queryClient.invalidateQueries({ queryKey: ["languages"] });
    },
  });

  const [target, setTarget] = useState("");
  const [english, setEnglish] = useState("");

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
    <RequireAuth>
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] px-5 pt-8 pb-32">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Editing</div>
          <h1 className="text-3xl font-bold tracking-tight">{lang.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang.words.length} {lang.words.length === 1 ? "word" : "words"}
          </p>
        </header>

        <section className="space-y-2 mb-8">
          <AnimatePresence initial={false}>
            {lang.words.map((w) => (
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
          {lang.words.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No words yet. Add your first pair below.</p>
            </div>
          )}
        </section>

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
            <Plus className="w-4 h-4" /> {addWordMutation.isPending ? "Adding…" : "Add"}
          </button>
        </form>
      </div>
    </div>
    </RequireAuth>
  );
}
