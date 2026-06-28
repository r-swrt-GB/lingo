import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Layers, Pencil, Trash2, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addLanguage, deleteLanguage, getLanguages } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { RequireAuth } from "@/components/require-auth";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Lingo" },
      { name: "description", content: "Mobile-first flashcard quizzes for any language you want to learn." },
    ],
  }),
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();
  const { data: languages = [], isLoading } = useQuery({ queryKey: ["languages"], queryFn: getLanguages });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const addMutation = useMutation({
    mutationFn: ({ name, isPublic }: { name: string; isPublic: boolean }) => addLanguage(name, isPublic),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["languages"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLanguage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["languages"] }),
  });

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addMutation.mutate(
      { name, isPublic },
      {
        onSuccess: () => {
          setName("");
          setIsPublic(true);
          setAdding(false);
        },
      },
    );
  };

  return (
    <RequireAuth>
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] px-5 pt-10 pb-24">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <img src="/images/logo.png" alt="Lingo" className="h-10" />
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Profile"
              >
                <User className="w-3.5 h-3.5" />
                Profile
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-6">Your languages</h1>
          <p className="text-sm text-muted-foreground mt-1">Tap a card to play or edit.</p>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 h-[88px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {languages.map((lang) => {
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
                        <p className="text-[11px] italic text-muted-foreground mt-0.5">
                          Created by {lang.createdBy}
                          {!lang.isPublic && " · Private"}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {(lang.myRole === "owner" || lang.myRole === "editor") && (
                          <Link
                            to="/edit/$languageId"
                            params={{ languageId: lang.id }}
                            className="text-muted-foreground hover:text-foreground p-1"
                            aria-label="Edit language"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                        )}
                        {lang.myRole === "owner" && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${lang.name}"?`)) deleteMutation.mutate(lang.id);
                            }}
                            className="text-muted-foreground hover:text-foreground p-1"
                            aria-label="Delete language"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link
                        to="/language/$languageId"
                        params={{ languageId: lang.id }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 active:scale-[0.98] transition-transform"
                      >
                        <Layers className="w-4 h-4" /> View decks
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
                <div className="flex items-center justify-between px-2 py-2 border-t border-border">
                  <div>
                    <p className="text-sm font-medium">{isPublic ? "Public" : "Private"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isPublic ? "Everyone can see this language" : "Only you can see this language"}
                    </p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} aria-label="Public or private" />
                </div>
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
    </RequireAuth>
  );
}
