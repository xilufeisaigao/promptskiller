# [PromptSkiller] 管理员账号开通记录（2026-02-28）

本文档记录一次“直接指定 user_id 并执行 SQL”的管理员开通操作，便于追溯。

## 1) 指定账号信息

- `user_id`：`9f3c5f3a-6d5f-4b9f-9a88-2f9f8db6a4e1`
- `email`：`seed-admin-20260228@promptskiller.local`
- `handle`：`seed-admin-20260228`
- `display_name`：`Seed Admin`
- `is_admin`：`true`

## 2) 执行时间

- 执行日期：2026-02-28（Asia/Shanghai）
- 执行人：Codex（按用户要求直接执行 SQL）

## 3) 已执行 SQL（等价语句）

```sql
begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
values (
  '9f3c5f3a-6d5f-4b9f-9a88-2f9f8db6a4e1'::uuid,
  'authenticated',
  'authenticated',
  'seed-admin-20260228@promptskiller.local',
  now(),
  '{}'::jsonb,
  jsonb_build_object('seeded_by', 'codex', 'seeded_at_utc', now()::text),
  now(),
  now(),
  false,
  false
)
on conflict (id) do update set
  email = excluded.email,
  updated_at = now(),
  raw_user_meta_data = coalesce(auth.users.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('seeded_by', 'codex', 'seeded_at_utc', now()::text);

insert into public.profiles (id, display_name, handle, is_admin)
values (
  '9f3c5f3a-6d5f-4b9f-9a88-2f9f8db6a4e1'::uuid,
  'Seed Admin',
  'seed-admin-20260228',
  true
)
on conflict (id) do update set
  is_admin = true,
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  handle = coalesce(public.profiles.handle, excluded.handle);

update auth.users
set encrypted_password = crypt('PromptSkiller#Admin2026', gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where id = '9f3c5f3a-6d5f-4b9f-9a88-2f9f8db6a4e1'::uuid;

commit;
```

## 4) 验证结果

已验证以下结果：

- `auth.users` 中存在该 `id` 与 `email`
- `public.profiles.is_admin = true`
- `encrypted_password` 已存在（可用于密码登录）

## 5) 登录信息（仅本地/测试用途）

- 登录邮箱：`seed-admin-20260228@promptskiller.local`
- 初始密码：`PromptSkiller#Admin2026`

建议：首次登录后台后尽快修改为你自己的正式管理员账号与密码策略。
