-- Add a BCP-47 locale tag to languages so text-to-speech can pick the right
-- voice independently of the human-readable display name.
--
-- `name`   stays the display label shown in the UI (e.g. "German").
-- `locale` is the BCP-47 tag used for SpeechSynthesis (e.g. "de-DE").

alter table public.languages
  add column if not exists locale text;

-- Backfill the languages currently in the system.
update public.languages set locale = 'de-DE' where locale is null and name = 'German';
update public.languages set locale = 'af-ZA' where locale is null and name = 'Afrikaans';
update public.languages set locale = 'tn-ZA' where locale is null and name = 'Setswana';

-- Any remaining rows fall back to English so the column can be required.
update public.languages set locale = 'en-US' where locale is null;

alter table public.languages
  alter column locale set not null,
  alter column locale set default 'en-US';
