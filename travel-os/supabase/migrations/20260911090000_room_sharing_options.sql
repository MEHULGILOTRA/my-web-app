-- Room configuration, restated as sharing basis.
--
-- The original values described room *types* — "1 Double", "1 Twin",
-- "1 Double + 1 Twin". That is how a hotel describes inventory, not how this
-- agency quotes: pricing is per adult on a sharing basis, which is also what
-- `pricing_basis` already says elsewhere. An agent asked for the room
-- configuration of a 20-pax group had no sensible answer to give.

-- 1. Add the new basis values.
insert into public.option_sets (set_key, value, label, sort_order, is_system)
values
  ('room_configuration', 'single_sharing', 'Single sharing', 1, false),
  ('room_configuration', 'double_sharing', 'Double sharing', 2, false),
  ('room_configuration', 'triple_sharing', 'Triple sharing', 3, false)
on conflict (set_key, value) do update
  set label      = excluded.label,
      sort_order = excluded.sort_order,
      is_active  = true;

-- 2. Remap existing rows BEFORE the old values are deactivated.
--
--    Order matters. `assert_option` requires `is_active`, so a row still
--    holding a deactivated value cannot be saved again — the next person to
--    edit that lead would hit "Invalid value for dropdown" with no idea why.
--
--    A double or twin holds two people either way, so both become double
--    sharing. Family rooms and suites are usually three or more. "1 Double +
--    1 Twin" is four across two rooms, which has no single-basis equivalent;
--    double sharing is the honest reading.
update public.leads
   set room_configuration = case room_configuration
     when '1_double'        then 'double_sharing'
     when '1_twin'          then 'double_sharing'
     when '2_double'        then 'double_sharing'
     when '1_double_1_twin' then 'double_sharing'
     when 'family_room'     then 'triple_sharing'
     when 'suite'           then 'triple_sharing'
     else room_configuration
   end
 where room_configuration in
   ('1_double', '1_twin', '2_double', '1_double_1_twin', 'family_room', 'suite');

update public.trips
   set room_configuration = case room_configuration
     when '1_double'        then 'double_sharing'
     when '1_twin'          then 'double_sharing'
     when '2_double'        then 'double_sharing'
     when '1_double_1_twin' then 'double_sharing'
     when 'family_room'     then 'triple_sharing'
     when 'suite'           then 'triple_sharing'
     else room_configuration
   end
 where room_configuration in
   ('1_double', '1_twin', '2_double', '1_double_1_twin', 'family_room', 'suite');

-- 3. Retire the old values.
--
--    Deactivated rather than deleted: the rows stay as a record of what the
--    dropdown once offered, and `option_sets_lookup` is a partial index on
--    `is_active`, so they cost nothing to leave behind.
update public.option_sets
   set is_active = false
 where set_key = 'room_configuration'
   and value in
     ('1_double', '1_twin', '2_double', '1_double_1_twin', 'family_room', 'suite');
