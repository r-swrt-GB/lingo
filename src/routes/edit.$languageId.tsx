import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getLanguage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { RequireAuth } from "@/components/require-auth";
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
  return (
    <RequireAuth>
      <EditLanguageInner />
    </RequireAuth>
  );
}

function EditLanguageInner() {
  const { languageId } = Route.useParams();
  const navigate = useNavigate();

  const { data: lang, isLoading } = useQuery({
    queryKey: ["language", languageId],
    queryFn: () => getLanguage(languageId),
  });

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

  if (lang.myRole !== "owner") {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="text-center max-w-[320px]">
          <p className="text-sm text-muted-foreground mb-4">Only the owner can manage members.</p>
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

  return (
    <RequireAuth>
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
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Members</div>
            <h1 className="text-3xl font-bold tracking-tight">{lang.name}</h1>
          </header>

          <InviteTab languageId={lang.id} isPublic={lang.isPublic} />
        </div>
      </div>
    </RequireAuth>
  );
}
