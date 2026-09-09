-- Layer 10 — linking Supabase Auth accounts to our own records.
--
-- Two kinds of human log into this system and they must never be confused:
--
--   * staff    -> public.staff_users, can see supplier costs and margins
--   * customer -> public.customers.portal_user_id, can see their own trips
--
-- Both are rows in auth.users. A naive "on signup, create a staff_user" trigger
-- would silently promote every customer who registers for the portal into a
-- staff member with full access to the agency's margins. So the trigger
-- dispatches on an explicit marker set at creation time, and does nothing at all
-- when that marker is absent.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_type text;
  v_full_name text;
begin
  -- app_metadata, not user_metadata: user_metadata is writable by the client,
  -- so trusting it here would let anyone sign themselves up as staff.
  v_user_type := new.raw_app_meta_data ->> 'user_type';
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  if v_user_type = 'staff' then
    insert into public.staff_users (id, full_name, email, role)
    values (
      new.id,
      v_full_name,
      new.email,
      coalesce(new.raw_app_meta_data ->> 'role', 'admin')
    )
    on conflict (id) do nothing;

  elsif v_user_type = 'customer' then
    -- Attach to an existing customer record by email. Never creates one: staff
    -- create customers, and an unrecognised signup must not become a ghost.
    update public.customers
       set portal_user_id = new.id
     where lower(email) = lower(new.email)
       and portal_user_id is null
       and merged_into_customer_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep the mirrored email in step when it is changed in Supabase Auth.
create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.staff_users set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_auth_user_email_change();

-- ---------------------------------------------------------------------------
-- Session helper used by the app rather than re-querying staff_users everywhere.
-- ---------------------------------------------------------------------------
create or replace function public.current_staff()
returns public.staff_users
language sql
stable
security definer
set search_path = public
as $$
  select * from public.staff_users where id = auth.uid() and is_active;
$$;
