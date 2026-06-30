-- One score row per (deck, user). Without this constraint the upsert in
-- submitScore had nothing to conflict on, so every save threw and the table
-- stayed empty; duplicate rows would also break the .maybeSingle() reads in
-- getDeck/submitScore.

-- Remove any duplicates that slipped in beforehand, keeping the best score.
delete from public.scores a
using public.scores b
where a.deck_id = b.deck_id
  and a.user_id = b.user_id
  and (a.score < b.score or (a.score = b.score and a.ctid > b.ctid));

alter table public.scores
  add constraint scores_deck_user_unique unique (deck_id, user_id);
