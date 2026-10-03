-- Fonksiyonların PUBLIC/anon tarafından RPC ile çağrılmasını engelle.
-- my_company_id / is_admin RLS içinde kullanıldığı için authenticated'a açık kalır
-- (sadece çağıranın kendi şirketini / rolünü döner).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.my_company_id() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.add_customer_message(text, text, jsonb) from public, anon;
grant execute on function public.my_company_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.add_customer_message(text, text, jsonb) to authenticated;
