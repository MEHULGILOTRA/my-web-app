-- Supabase's GoTrue admin API inserts the auth.users row first and applies
-- app_metadata in a second step. The AFTER INSERT trigger therefore sees an
-- empty raw_app_meta_data, finds no 'user_type' marker, and correctly does
-- nothing — leaving an auth account with no staff_users row behind it.
--
-- Verified by inserting into auth.users directly with metadata present: the
-- trigger fires and creates the staff row exactly as intended. The logic was
-- never the problem, the timing was.
--
-- So also sync when the metadata arrives. handle_new_auth_user() is written
-- against `new` only and upserts, so it is safe on both events.

drop trigger if exists on_auth_user_metadata_changed on auth.users;
create trigger on_auth_user_metadata_changed
  after update of raw_app_meta_data on auth.users
  for each row
  when (new.raw_app_meta_data is distinct from old.raw_app_meta_data)
  execute function public.handle_new_auth_user();
