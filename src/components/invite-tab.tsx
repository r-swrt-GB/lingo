import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, X, Trash2, UserPlus } from "lucide-react";
import {
  searchUsers,
  getMembers,
  setMember,
  removeMember,
  type UserSearchResult,
  type Role,
} from "@/lib/storage";

type InviteRole = Exclude<Role, "owner">;

type Props = {
  languageId: string;
  isPublic: boolean;
};

export function InviteTab({ languageId, isPublic }: Props) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  // Public languages only support the editor role (everyone can already view).
  const [role, setRole] = useState<InviteRole>("editor");
  const [error, setError] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", languageId],
    queryFn: () => getMembers(languageId),
  });

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["userSearch", query],
    queryFn: () => searchUsers(query),
    enabled: !selected && query.trim().length >= 2,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["members", languageId] });

  const addMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: InviteRole }) =>
      setMember(languageId, userId, role),
    onSuccess: () => {
      invalidate();
      setSelected(null);
      setQuery("");
      setRole("editor");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: InviteRole }) =>
      setMember(languageId, userId, role),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(languageId, userId),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Invite people</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {isPublic
            ? "Anyone can already play this language. Invite editors to let them add and edit words."
            : "Invite viewers to play, or editors to manage words too."}
        </p>

        {!selected ? (
          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by email"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {query.trim().length >= 2 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                {isFetching ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">No users found</div>
                ) : (
                  results.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelected(u);
                        setError(null);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors"
                    >
                      <div className="text-sm font-medium truncate">{u.username || u.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{selected.username || selected.email}</div>
                <div className="text-xs text-muted-foreground truncate">{selected.email}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground p-1 shrink-0"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isPublic && (
              <div className="grid grid-cols-2 gap-2">
                {(["viewer", "editor"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      role === r ? "border-foreground bg-foreground text-background" : "border-border"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => addMutation.mutate({ userId: selected.id, role: isPublic ? "editor" : role })}
              disabled={addMutation.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {addMutation.isPending ? "Adding…" : `Add as ${isPublic ? "editor" : role}`}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-[color:var(--color-error)] mt-2">{error}</p>}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">People with access</h3>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card h-[52px] animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one else has access yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.username || m.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
                {isPublic ? (
                  <span className="text-xs font-medium text-muted-foreground capitalize px-2">{m.role}</span>
                ) : (
                  <select
                    value={m.role}
                    onChange={(e) =>
                      roleMutation.mutate({ userId: m.userId, role: e.target.value as InviteRole })
                    }
                    className="text-xs rounded-md border border-border bg-background px-2 py-1 outline-none"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                )}
                <button
                  onClick={() => removeMutation.mutate(m.userId)}
                  className="text-muted-foreground hover:text-foreground p-1 shrink-0"
                  aria-label="Remove access"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
