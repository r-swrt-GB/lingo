import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addWords, type Word } from "@/lib/storage";

type Summary = {
  imported: number;
  duplicates: string[];
  skipped: number;
};

type Props = {
  languageId: string;
  languageName: string;
  existingWords: Word[];
  onImported: () => void;
};

export function ImportWordsDialog({ languageId, languageName, existingWords, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setError(null);
    setSummary(null);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const rows = [
      [`${languageName} word`, "English Word"],
      ["", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 24 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Words");
    XLSX.writeFile(wb, `${languageName}-words-template.xlsx`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

      // Drop the header row.
      const dataRows = rows.slice(1);

      // Seed the seen-set with existing words (lowercased target) to detect duplicates.
      const seen = new Set(existingWords.map((w) => w.target.trim().toLowerCase()));

      const toAdd: { target: string; english: string }[] = [];
      const duplicates: string[] = [];
      let skipped = 0;

      for (const row of dataRows) {
        const target = String(row?.[0] ?? "").trim();
        const english = String(row?.[1] ?? "").trim();
        if (!target || !english) {
          if (target || english) skipped++; // partially-filled row
          continue;
        }
        const key = target.toLowerCase();
        if (seen.has(key)) {
          duplicates.push(target);
          continue;
        }
        seen.add(key);
        toAdd.push({ target, english });
      }

      await addWords(languageId, toAdd);
      if (toAdd.length > 0) onImported();
      setSummary({ imported: toAdd.length, duplicates, skipped });
    } catch (err) {
      console.error(err);
      setError("Couldn't read that file. Make sure it's an .xlsx or .csv with two columns.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium py-3 active:scale-[0.98] transition-transform">
          <FileSpreadsheet className="w-4 h-4" /> Import from Excel
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import words</DialogTitle>
          <DialogDescription>
            Download the template, fill in your word pairs, then upload it. Duplicate words are
            skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium py-2.5 active:scale-[0.98] transition-transform"
          >
            <Download className="w-4 h-4" /> Download template
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> {busy ? "Importing…" : "Select file"}
          </button>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[color:var(--color-error)]/40 bg-[color:var(--color-error)]/10 p-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[color:var(--color-error)]" />
              <span>{error}</span>
            </div>
          )}

          {summary && (
            <div className="rounded-lg border border-border bg-card p-3 text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-[color:var(--color-success)]" />
                Imported {summary.imported} {summary.imported === 1 ? "word" : "words"}
              </div>
              {summary.duplicates.length > 0 && (
                <div className="text-muted-foreground">
                  <p>
                    Skipped {summary.duplicates.length} duplicate
                    {summary.duplicates.length === 1 ? "" : "s"}:
                  </p>
                  <p className="mt-0.5 break-words">{summary.duplicates.join(", ")}</p>
                </div>
              )}
              {summary.skipped > 0 && (
                <p className="text-muted-foreground">
                  Skipped {summary.skipped} incomplete {summary.skipped === 1 ? "row" : "rows"} (missing a
                  word or translation).
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
