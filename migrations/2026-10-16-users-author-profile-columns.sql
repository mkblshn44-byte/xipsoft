-- XipSoft — eksik `users.nick` kolonu (profil handle'ı)
--
-- Sorun: `src/lib/blog/detail.ts` (BLOG_AUTHOR_COLUMNS) ve
-- `src/lib/user-profile.ts` (USER_PROFILE_SQL) `users.nick` kolonunu seçiyor,
-- ama production şemasında bu kolon yok. PostgreSQL 42703
-- ("column u.nick does not exist") fırlatıyor ve `/blog/[slug]` detay sayfası
-- 500 dönüyor.
--
-- Doğrulama: `users` tablosunda eksik olan TEK kolon `nick`
-- (bio, linkedin_url, github_url, twitter_url, expertise_area,
--  years_experience, is_expert → mevcut). `blog_posts` şeması tam.
--
-- Not: `users.uid` AYRI bir alandır (auth/session kimliği) ve profil
-- handle'ı değildir; bu yüzden `nick` yeniden adlandırılmaz, eklenir.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nick TEXT;

-- /x/[nick] profil rotasının aradığı indeks (nick NULL olanlar hariç —
-- çünkü kod nick yoksa display_name'e düşüyor).
CREATE UNIQUE INDEX IF NOT EXISTS users_nick_lower_idx
  ON users (LOWER(nick))
  WHERE nick IS NOT NULL AND deleted_at IS NULL;
