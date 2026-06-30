import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Play, Zap, Layers, SlidersHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GameMode } from "@/routes/play.$languageId.$deckId";

const BLITZ_COUNT = 10;

export function GameModeDialog({
  languageId,
  deckId,
  wordCount,
}: {
  languageId: string;
  deckId: string;
  wordCount: number;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(Math.min(BLITZ_COUNT, wordCount));

  const start = (mode: GameMode, count?: number) => {
    setOpen(false);
    navigate({
      to: "/play/$languageId/$deckId",
      params: { languageId, deckId },
      search: { mode, count },
    });
  };

  const customCount = Math.max(4, Math.min(custom || 0, wordCount));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 active:scale-[0.98] transition-transform">
          <Play className="w-4 h-4" /> Play
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Choose a game mode</DialogTitle>
          <DialogDescription>Pick how you want to practise this deck.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <button
            onClick={() => start("full")}
            className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-foreground transition-colors"
          >
            <div className="flex items-center gap-2 font-medium">
              <Layers className="w-4 h-4" /> Full
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All {wordCount} words, randomised. Counts towards the leaderboard.
            </p>
          </button>

          <button
            onClick={() => start("blitz")}
            className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-foreground transition-colors"
          >
            <div className="flex items-center gap-2 font-medium">
              <Zap className="w-4 h-4" /> Blitz
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.min(BLITZ_COUNT, wordCount)} random questions. Practice only — not ranked.
            </p>
          </button>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 font-medium">
              <SlidersHorizontal className="w-4 h-4" /> Custom
            </div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Choose how many random questions. Practice only — not ranked.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={4}
                max={wordCount}
                value={custom}
                onChange={(e) => setCustom(Number(e.target.value))}
                className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
              />
              <span className="text-xs text-muted-foreground">of {wordCount}</span>
              <button
                onClick={() => start("custom", customCount)}
                className="ml-auto rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 active:scale-[0.98] transition-transform"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
