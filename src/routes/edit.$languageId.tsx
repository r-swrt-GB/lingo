import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addWord,
  addWordToDeck,
  deleteWord,
  deleteDeck,
  addDeck,
  getDeckWordIds,
  getDecks,
  getLanguage,
  removeWordFromDeck,
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { RequireAuth } from "@/components/require-auth";
import { ImportWordsDialog } from "@/components/import-words-dialog";
import { InviteTab } from "@/components/invite-tab";

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

  const { data: decks = [] } = useQuery({
    queryKey: ["decks", languageId],
    queryFn: () => getDecks(languageId),
  });

  const addWordMutation = useMutation({
    mutationFn: ({ target, english }: { target: string; english: string }) =>
      addWord(languageId, target, english),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["language", languageId] });
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: (wordId: string) => deleteWord(wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["language", languageId] });
    },
  });

  const addDeckMutation = useMutation({
    mutationFn: (name: string) => addDeck(languageId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks", languageId] });
      setNewDeckName("");
      setAddingDeck(false);
    },
  });

  const deleteDeckMutation = useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks", languageId] });
    },
  });

  const [target, setTarget] = useState("");
  const [english, setEnglish] = useState("");
  const [tab, setTab] = useState<"words" | "decks" | "invite">("words");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [addingDeck, setAddingDeck] = useState(false);

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

  const isOwner = lang.myRole === "owner";
  const canEdit = isOwner || lang.myRole === "editor";

  if (!canEdit) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="text-center max-w-[320px]">
          <p className="text-sm text-muted-foreground mb-4">You don't have edit access to this language.</p>
          <Link
            to="/language/$languageId"
            params={{ languageId: lang.id }}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            View decks
          </Link>
        </div>
      </div>
    );
  }

  const submitWord = (e: React.FormEvent) => {
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

  const submitDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    addDeckMutation.mutate(newDeckName);
  };

  const tabs = isOwner
    ? (["words", "decks", "invite"] as const)
    : (["words", "decks"] as const);

  return (
    <RequireAuth>
      <div className="min-h-dvh flex justify-center">
        <div className="w-full max-w-[420px] px-5 pt-8 pb-32">
          <Link
            to="/language/$languageId"
            params={{ languageId }}
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

          <div className="flex gap-1 mb-6 rounded-xl border border-border bg-card p-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {isOwner && tab === "invite" && <InviteTab languageId={lang.id} isPublic={lang.isPublic} />}

          {tab === "decks" && (
            <DecksTab
              languageId={languageId}
              decks={decks}
              words={lang.words}
              selectedDeckId={selectedDeckId}
              onSelectDeck={(id) => setSelectedDeckId((prev) => (prev === id ? null : id))}
              onDeleteDeck={(id) => deleteDeckMutation.mutate(id)}
              addingDeck={addingDeck}
              newDeckName={newDeckName}
              onNewDeckNameChange={setNewDeckName}
              onStartAdding={() => setAddingDeck(true)}
              onCancelAdding={() => { setAddingDeck(false); setNewDeckName(""); }}
              onSubmitDeck={submitDeck}
              isPending={addDeckMutation.isPending}
              queryClient={queryClient}
            />
          )}

          {tab === "words" && (
            <>
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

              <div className="mb-3">
                <ImportWordsDialog
                  languageId={lang.id}
                  languageName={lang.name}
                  existingWords={lang.words}
                  onImported={() => {
                    queryClient.invalidateQueries({ queryKey: ["language", languageId] });
                  }}
                />
              </div>

              <form onSubmit={submitWord} className="rounded-xl border border-border bg-card p-3 space-y-2">
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
            </>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

type DecksTabProps = {
  languageId: string;
  decks: { id: string; name: string; wordCount: number }[];
  words: { id: string; target: string; english: string }[];
  selectedDeckId: string | null;
  onSelectDeck: (id: string) => void;
  onDeleteDeck: (id: string) => void;
  addingDeck: boolean;
  newDeckName: string;
  onNewDeckNameChange: (v: string) => void;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  onSubmitDeck: (e: React.FormEvent) => void;
  isPending: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
};

function DecksTab({
  languageId,
  decks,
  words,
  selectedDeckId,
  onSelectDeck,
  onDeleteDeck,
  addingDeck,
  newDeckName,
  onNewDeckNameChange,
  onStartAdding,
  onCancelAdding,
  onSubmitDeck,
  isPending,
  queryClient,
}: DecksTabProps) {
  const { data: deckWordIds = new Set<string>() } = useQuery({
    queryKey: ["deck-word-ids", selectedDeckId],
    queryFn: () => getDeckWordIds(selectedDeckId!),
    enabled: !!selectedDeckId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ wordId, inDeck }: { wordId: string; inDeck: boolean }) =>
      inDeck
        ? removeWordFromDeck(selectedDeckId!, wordId)
        : addWordToDeck(selectedDeckId!, wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deck-word-ids", selectedDeckId] });
      queryClient.invalidateQueries({ queryKey: ["decks", languageId] });
    },
  });

  return (
    <div>
      {decks.length === 0 && !addingDeck && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center mb-4">
          <p className="text-sm text-muted-foreground">No decks yet. Create one below.</p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {decks.map((deck) => {
          const isOpen = selectedDeckId === deck.id;
          return (
            <div key={deck.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => onSelectDeck(deck.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold truncate block">{deck.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {deck.wordCount} {deck.wordCount === 1 ? "word" : "words"}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${deck.name}"?`)) onDeleteDeck(deck.id);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 -mr-1 shrink-0"
                  aria-label="Delete deck"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="px-3 py-2 space-y-1">
                      {words.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          No words in this language yet.
                        </p>
                      ) : (
                        words.map((w) => {
                          const inDeck = deckWordIds.has(w.id);
                          return (
                            <label
                              key={w.id}
                              className="flex items-center gap-3 py-1.5 cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                checked={inDeck}
                                onChange={() => toggleMutation.mutate({ wordId: w.id, inDeck })}
                                className="w-4 h-4 accent-primary shrink-0"
                              />
                              <span className="flex-1 min-w-0 flex items-baseline gap-2">
                                <span className="font-medium text-sm truncate">{w.target}</span>
                                <span className="text-muted-foreground text-xs shrink-0">→</span>
                                <span className="text-xs text-muted-foreground truncate">{w.english}</span>
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {addingDeck ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={onSubmitDeck}
            className="rounded-xl border border-border bg-card p-3 space-y-2"
          >
            <input
              autoFocus
              value={newDeckName}
              onChange={(e) => onNewDeckNameChange(e.target.value)}
              placeholder="Deck name (e.g. Chapter 1, Verbs)"
              className="w-full bg-transparent text-base outline-none px-2 py-2 placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancelAdding}
                className="flex-1 rounded-lg border border-border text-sm font-medium py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 disabled:opacity-50"
              >
                {isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            key="btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onStartAdding}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium py-3.5 active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" /> New deck
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
