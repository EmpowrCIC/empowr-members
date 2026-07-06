-- Empowr Members — auto-create mem_accounts row on auth signup (Phase 0 Step 3)

create function mem_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mem_accounts (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

-- Trigger-only function: no role should call it directly
revoke execute on function mem_handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_mem
  after insert on auth.users
  for each row execute function mem_handle_new_user();
