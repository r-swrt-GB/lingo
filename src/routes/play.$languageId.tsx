import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, X, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLanguage, updateHighScore, useStore, type Word } from "@/lib/storage";

export const Route = createFileRoute("/play/$languageId")({
  component: PlayLanguage,

});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Question = { word: Word; options: string[] };

function buildSession(words: Word[]): Question[] {
  const order = shuffle(words);
  return order.map((w) => {
    const distractors = shuffle(words.filter((x) => x.id !== w.id))
      .slice(0, 3)
      .map((x) => x.english);
    const options = shuffle([w.english, ...distractors]);
    return { word: w, options };
  });
}

function PlayLanguage() {
  const { languageId } = Route.useParams();
  const navigate = useNavigate();
  const lang = useStore(() => getLanguage(languageId));

  const [seed, setSeed] = useState(0);
  const questions = useMemo(() => (lang ? buildSession(lang.words) : []), [lang?.id, seed, lang?.words.length]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [newHigh, setNewHigh] = useState(false);

  if (!lang) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <button onClick={() => navigate({ to: "/" })} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
          Go home
        </button>
      </div>
    );
  }

  if (lang.words.length < 5) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="text-center max-w-[320px]">
          <p className="text-sm text-muted-foreground mb-4">Add at least 5 words to play.</p>
          <Link to="/edit/$languageId" params={{ languageId: lang.id }} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
            Add words
          </Link>
        </div>
      </div>
    );
  }

  const total = questions.length;
  const current = questions[index];

  const submit = () => {
    if (!selected) return;
    setSubmitted(true);
    if (selected === current.word.english) {
      setScore((s) => s + 1);
    }
  };

  const next = () => {
    if (index + 1 >= total) {
      const finalScore = score;
      const beat = updateHighScore(lang.id, finalScore);
      setNewHigh(beat);
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
    }
  };

  const playAgain = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setFinished(false);
    setNewHigh(false);
  };

  if (finished) {
    return (
      <div className="min-h-dvh flex justify-center">
        <div className="w-full max-w-[420px] px-5 pt-8 pb-12 flex flex-col">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-10 hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center"
          >
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">Session complete</div>
            <div className="text-7xl font-bold tracking-tight">
              {score}<span className="text-muted-foreground">/{total}</span>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4" />
              <span>High score: {Math.max(score, lang.highScore)}</span>
            </div>
            {newHigh && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-3 inline-block rounded-full border border-border px-3 py-1 text-xs font-medium"
              >
                New high score
              </motion.div>
            )}
            <div className="mt-12 w-full space-y-2">
              <button
                onClick={playAgain}
                className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 active:scale-[0.98] transition-transform"
              >
                Play again
              </button>
              <Link
                to="/"
                className="block w-full rounded-xl border border-border font-medium py-3.5 text-center"
              >
                Home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] px-5 pt-6 pb-8 flex flex-col min-h-dvh">
        <div className="flex items-center justify-between mb-2">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-sm font-medium">{lang.name}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {index + 1} / {total}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-6">
          <span>Score: <span className="text-foreground font-medium tabular-nums">{score}</span></span>
          <span className="inline-flex items-center gap-1">
            <Trophy className="w-3 h-3" /> High: <span className="text-foreground font-medium tabular-nums">{lang.highScore}</span>
          </span>
        </div>

        {/* Progress */}
        <div className="h-0.5 bg-muted rounded-full overflow-hidden mb-10">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${((index + (submitted ? 1 : 0)) / total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Word */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.word.id}
            initial={{ opacity: 0, y: 8 }}
            animate={
              submitted && selected !== current.word.english
                ? { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, 0] }
                : submitted && selected === current.word.english
                ? { opacity: 1, y: [0, -6, 0], scale: [1, 1.05, 1] }
                : { opacity: 1, y: 0 }
            }
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-center py-8 mb-6"
          >
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">Translate</div>
            <div className="text-5xl font-bold tracking-tight break-words">{current.word.target}</div>
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        <div className="space-y-2.5 flex-1">
          {current.options.map((opt) => {
            const isSelected = selected === opt;
            const isCorrect = opt === current.word.english;
            let cls = "border-border bg-card";
            if (submitted) {
              if (isCorrect) cls = "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10 text-foreground";
              else if (isSelected) cls = "border-[color:var(--color-error)] bg-[color:var(--color-error)]/10 text-foreground";
              else cls = "border-border bg-card opacity-50";
            } else if (isSelected) {
              cls = "border-foreground bg-foreground text-background";
            }
            return (
              <button
                key={opt}
                disabled={submitted}
                onClick={() => setSelected(opt)}
                className={`w-full text-left rounded-xl border px-4 py-3.5 text-base font-medium transition-colors flex items-center justify-between gap-3 ${cls}`}
              >
                <span className="flex-1">{opt}</span>
                {submitted && isCorrect && <Check className="w-5 h-5 text-[color:var(--color-success)] shrink-0" />}
                {submitted && isSelected && !isCorrect && <X className="w-5 h-5 text-[color:var(--color-error)] shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {!submitted ? (
            <button
              onClick={submit}
              disabled={!selected}
              className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 active:scale-[0.98] transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={next}
              className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-3.5 active:scale-[0.98] transition-transform"
            >
              {index + 1 >= total ? "See results" : "Next"}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
