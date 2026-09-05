BEGIN;

-- Idempotent by construction: wipe, then insert fresh.
-- Deleting users cascades to posts, media, comments, likes and stories.
DELETE FROM users;
DELETE FROM locations;

-- ══ locations (15) ═══════════════════════════════════════════════════
-- Lekki Phase 1 gets a fixed UUID because the design posts reference it.
INSERT INTO locations (id, name, slug, display_label, level, city, state) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Lekki Phase 1', 'lekki-phase-1', 'Lekki Phase 1, Lagos', 3, 'Lagos', 'Lagos');

INSERT INTO locations (name, slug, display_label, level, city, state) VALUES
  ('Lekki Phase 2',  'lekki-phase-2',  'Lekki Phase 2, Lagos',  3, 'Lagos', 'Lagos'),
  ('Ikoyi',          'ikoyi',          'Ikoyi, Lagos',          3, 'Lagos', 'Lagos'),
  ('Victoria Island','victoria-island','Victoria Island, Lagos',3, 'Lagos', 'Lagos'),
  ('Yaba',           'yaba',           'Yaba, Lagos',           3, 'Lagos', 'Lagos'),
  ('Akoka',          'akoka',          'Akoka, Lagos',          3, 'Lagos', 'Lagos'),
  ('Surulere',       'surulere',       'Surulere, Lagos',       3, 'Lagos', 'Lagos'),
  ('Ikeja GRA',      'ikeja-gra',      'Ikeja GRA, Lagos',      3, 'Lagos', 'Lagos'),
  ('Ajah',           'ajah',           'Ajah, Lagos',           3, 'Lagos', 'Lagos'),
  ('Magodo',         'magodo',         'Magodo, Lagos',         3, 'Lagos', 'Lagos'),
  ('Gbagada',        'gbagada',        'Gbagada, Lagos',        3, 'Lagos', 'Lagos'),
  ('Maryland',       'maryland',       'Maryland, Lagos',       3, 'Lagos', 'Lagos'),
  ('Oniru',          'oniru',          'Oniru, Lagos',          3, 'Lagos', 'Lagos'),
  ('Chevron',        'chevron',        'Chevron, Lagos',        3, 'Lagos', 'Lagos'),
  ('Sangotedo',      'sangotedo',      'Sangotedo, Lagos',      3, 'Lagos', 'Lagos');

-- ══ users (9) ════════════════════════════════════════════════════════
-- miracle.h's UUID must match MOCK_USER_ID in .env: it is what makes
-- viewer_has_liked resolve to something real in the demo.
-- Avatars are external placeholders (i.pravatar.cc), not uploaded assets.
INSERT INTO users (id, username, display_name, role, is_business, is_verified, avatar_url) VALUES
  ('00000000-0000-0000-0000-000000000001', 'miracle.h',   'Miracle H',    'individual', false, false, 'https://i.pravatar.cc/150?u=miracle.h'),
  (gen_random_uuid(),                      'felix.okon',  'Felix Okon',   'broker',     false, false, 'https://i.pravatar.cc/150?u=felix.okon'),
  (gen_random_uuid(),                      'boyd.from',   'Boyd From',    'developer',  true,  false, 'https://i.pravatar.cc/150?u=boyd.from'),
  (gen_random_uuid(),                      'ramosrealty', 'Ramos Realty', 'agent',      true,  true,  'https://i.pravatar.cc/150?u=ramosrealty'),
  (gen_random_uuid(),                      'maurice.u',   'Maurice U',    'individual', false, false, 'https://i.pravatar.cc/150?u=maurice.u'),
  (gen_random_uuid(),                      'tunde_b',     'Tunde B',      'individual', false, false, 'https://i.pravatar.cc/150?u=tunde_b'),
  (gen_random_uuid(),                      'jordan',      'Jordan',       'agent',      false, false, 'https://i.pravatar.cc/150?u=jordan'),
  (gen_random_uuid(),                      'taylor',      'Taylor',       'landlord',   false, false, 'https://i.pravatar.cc/150?u=taylor'),
  (gen_random_uuid(),                      'jamie',       'Jamie',        'individual', false, false, 'https://i.pravatar.cc/150?u=jamie');

-- ══ filler users (21) ════════════════════════════════════════════════
-- Padding so post 3 can carry 23 distinct likers: post_likes' PRIMARY KEY
-- (post_id, user_id) caps a single post at one like per user, so 23 real
-- likes needs at least 23 users to exist. A few get broker/agent for variety.
INSERT INTO users (username, display_name, role, is_business, is_verified, avatar_url)
SELECT
  format('filler.%s', lpad(n::text, 2, '0')),
  format('Filler User %s', n),
  (CASE WHEN n IN (3, 9, 15) THEN 'broker' WHEN n IN (6, 12, 18) THEN 'agent' ELSE NULL END)::user_role,
  false, false,
  format('https://i.pravatar.cc/150?u=filler.%s', lpad(n::text, 2, '0'))
FROM generate_series(1, 21) AS n;

-- ══ posts 1-5: reproduce the design screen exactly (fixed UUIDs) ══════
-- All five sit in Lekki Phase 1; location_label is left NULL here so the
-- Part 5 trigger populates it — do not set it by hand.
INSERT INTO posts (id, author_id, post_type, transaction_type, body, location_id, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001',
   (SELECT id FROM users WHERE username = 'felix.okon'),
   'request', 'looking_to_buy',
   'Looking for a 2-bedroom apartment in Yaba or Akoka. Budget flexible for the right place.',
   '10000000-0000-0000-0000-000000000001', now() - interval '30 seconds');

INSERT INTO posts (id, author_id, post_type, body, location_id, view_count, created_at) VALUES
  ('20000000-0000-0000-0000-000000000002',
   (SELECT id FROM users WHERE username = 'maurice.u'),
   'general',
   'How is everyone holding up with the flooding around Lekki this week? Stay safe out there.',
   '10000000-0000-0000-0000-000000000001', 700, now() - interval '5 minutes');

INSERT INTO posts (id, author_id, post_type, transaction_type, body, location_id, bedrooms, bathrooms, parking_spaces, price_amount, price_period, view_count, bookmark_count, created_at) VALUES
  ('20000000-0000-0000-0000-000000000003',
   (SELECT id FROM users WHERE username = 'boyd.from'),
   'property', 'for_rent',
   'Newly serviced 3-bedroom apartment available for rent, fully fitted kitchen and gated compound.',
   '10000000-0000-0000-0000-000000000001', 3, 3, 2, 4500000, 'per_annum', 1043, 2, now() - interval '2 hours');

INSERT INTO posts (id, author_id, post_type, transaction_type, body, location_id, created_at) VALUES
  ('20000000-0000-0000-0000-000000000004',
   (SELECT id FROM users WHERE username = 'felix.okon'),
   'request', 'looking_to_rent',
   'Still hunting for a 2-bedroom to rent, moving next month. Let me know if you hear of anything in Lekki.',
   '10000000-0000-0000-0000-000000000001', now() - interval '22 hours');

INSERT INTO posts (id, author_id, post_type, transaction_type, body, location_id, bedrooms, price_amount, price_period, created_at) VALUES
  ('20000000-0000-0000-0000-000000000005',
   (SELECT id FROM users WHERE username = 'felix.okon'),
   'property', 'for_sale',
   '2-bedroom apartment for sale, quiet street, close to the expressway. Video walkthrough attached.',
   '10000000-0000-0000-0000-000000000001', 2, 65000000, 'total', now() - interval '3 days');

-- media for posts 3 and 5
INSERT INTO post_media (post_id, media_type, storage_path, public_url, width_px, height_px, position) VALUES
  ('20000000-0000-0000-0000-000000000003', 'image', 'seed/post3-a.webp', 'https://picsum.photos/seed/post3-a/1600/1067', 1600, 1067, 0);

INSERT INTO post_media (post_id, media_type, storage_path, public_url, thumbnail_url, duration_seconds, position) VALUES
  ('20000000-0000-0000-0000-000000000005', 'video', 'seed/post5-v.mp4', 'https://example.com/videos/post5-walkthrough.mp4', 'https://picsum.photos/seed/post5-thumb/1600/1067', 30, 0);

-- ══ 35 additional posts, now() - 4 days through now() - 45 days ══════
CREATE TEMP TABLE tmp_extra_posts (
  idx int, author text, post_type text, transaction_type text, days_ago int, body text,
  bedrooms int, bathrooms int, parking_spaces int, price_amount numeric, price_period text,
  loc_slug text, media_count int
) ON COMMIT DROP;

INSERT INTO tmp_extra_posts VALUES
  (1,  'tunde_b',     'general',  NULL,                   4, 'Anyone know a good plumber around Surulere? Need something fixed urgently.', NULL,NULL,NULL,NULL,NULL,NULL,0),
  (2,  'jordan',      'property', 'for_rent',             4, 'Modern 2-bedroom flat with backup power, fenced compound, in a quiet estate.', 2,2,1,2800000,'per_annum','ikeja-gra',1),
  (3,  'taylor',      'property', 'for_sale',             5, 'Detached 5-bedroom duplex with BQ, ready to move in, C of O available.', 5,5,4,120000000,'total','magodo',2),
  (4,  'jamie',       'general',  NULL,                   5, 'The traffic on Third Mainland this morning was brutal. Anyone else stuck?', NULL,NULL,NULL,NULL,NULL,NULL,0),
  (5,  'ramosrealty', 'property', 'for_shortlet',         6, 'Fully furnished 1-bedroom shortlet, weekly and monthly rates available.', 1,1,1,150000,'per_night','victoria-island',1),
  (6,  'felix.okon',  'request',  'looking_to_rent',      6, 'Client looking for a 3-bedroom in Ikoyi or VI, budget up to 6M per annum.', NULL,NULL,NULL,NULL,NULL,'ikoyi',0),
  (7,  'boyd.from',   'property', 'for_rent',             7, 'Brand new 3-bedroom terrace, all rooms ensuite, close to the tollgate.', 3,3,2,4200000,'per_annum','chevron',2),
  (8,  'maurice.u',   'general',  NULL,                   7, 'Does anyone have a recommendation for a reliable generator technician?', NULL,NULL,NULL,NULL,NULL,NULL,0),
  (9,  'miracle.h',   'request',  'looking_to_buy',       8, 'Looking to buy a plot of land around Sangotedo, please DM with listings.', NULL,NULL,NULL,NULL,NULL,'sangotedo',0),
  (10, 'jordan',      'property', 'for_sale',             8, 'Semi-detached 4-bedroom house with rooftop terrace, negotiable price.', 4,4,3,95000000,'total','gbagada',1),
  (11, 'taylor',      'request',  'looking_for_shortlet', 9, 'Need a shortlet for a week around Lekki, 2 guests, mid-range budget.', NULL,NULL,NULL,NULL,NULL,'lekki-phase-2',0),
  (12, 'tunde_b',     'property', 'for_rent',             9, 'Cozy 1-bedroom self-contain, prepaid meter, close to the bus stop.', 1,1,1,900000,'per_annum','yaba',1),
  (13, 'jamie',       'property', 'for_sale',            10, '2-bedroom bungalow on a corner piece, dry land, survey available.', 2,2,2,45000000,'total','ajah',0),
  (14, 'ramosrealty', 'request',  'looking_to_buy',      10, 'Buyer interested in a 4-bedroom detached house in Magodo or Gbagada.', NULL,NULL,NULL,NULL,NULL,'magodo',0),
  (15, 'felix.okon',  'general',  NULL,                  11, 'Great turnout at the community clean-up in Akoka this weekend.', NULL,NULL,NULL,NULL,NULL,NULL,1),
  (16, 'boyd.from',   'property', 'for_rent',            11, 'Serviced 2-bedroom apartment with pool and gym access, Oniru axis.', 2,2,2,5500000,'per_annum','oniru',2),
  (17, 'maurice.u',   'request',  'looking_to_rent',     12, 'Young professional looking for a self-contain in Yaba or Akoka.', NULL,NULL,NULL,NULL,NULL,'akoka',0),
  (18, 'miracle.h',   'general',  NULL,                  12, 'Does the new flyover near Ajah open to traffic yet?', NULL,NULL,NULL,NULL,NULL,NULL,0),
  (19, 'jordan',      'property', 'for_shortlet',        13, 'Luxury 3-bedroom shortlet apartment, daily cleaning included.', 3,3,2,220000,'per_night','ikoyi',2),
  (20, 'taylor',      'property', 'for_rent',            13, 'Affordable 2-bedroom flat, tiled floors, close to major road.', 2,2,1,1800000,'per_annum','surulere',1),
  (21, 'tunde_b',     'request',  'looking_to_buy',      14, 'Looking for a small commercial space to buy around Maryland.', NULL,NULL,NULL,NULL,NULL,'maryland',0),
  (22, 'jamie',       'property', 'for_sale',            15, '3-bedroom flat in a gated estate, swimming pool, 24-hour security.', 3,3,2,68000000,'total','lekki-phase-2',1),
  (23, 'ramosrealty', 'property', 'for_rent',            16, 'Newly built mini flat, all rooms tiled, water treatment plant on site.', 1,1,1,1200000,'per_annum','ajah',0),
  (24, 'felix.okon',  'general',  NULL,                  17, 'Looking for recommendations on a good interior decorator in Lagos.', NULL,NULL,NULL,NULL,NULL,NULL,0),
  (25, 'boyd.from',   'request',  'looking_for_shortlet',18, 'Need a shortlet apartment for visiting family, 3 nights, VI preferred.', NULL,NULL,NULL,NULL,NULL,'victoria-island',0),
  (26, 'maurice.u',   'property', 'for_sale',            19, '4-bedroom terrace duplex with excellent finishing, ready for occupation.', 4,4,2,78000000,'total','gbagada',2),
  (27, 'miracle.h',   'property', 'for_rent',            21, '2-bedroom flat close to the market, good road network, prepaid meter.', 2,2,1,1500000,'per_annum','surulere',0),
  (28, 'jordan',      'general',  NULL,                  23, 'Power has been stable in Magodo this whole week, finally!', NULL,NULL,NULL,NULL,NULL,NULL,0),
  (29, 'taylor',      'request',  'looking_to_rent',     25, 'Looking for a self-contain close to Yabatech, student budget.', NULL,NULL,NULL,NULL,NULL,'yaba',0),
  (30, 'tunde_b',     'property', 'for_shortlet',        27, 'Studio apartment shortlet, walking distance to the beach, weekend rates.', 1,1,1,90000,'per_night','oniru',1),
  (31, 'jamie',       'property', 'for_rent',            29, '3-bedroom duplex with BQ, family-friendly neighbourhood, quiet street.', 3,3,2,3800000,'per_annum','magodo',2),
  (32, 'ramosrealty', 'property', 'for_sale',            32, '5-bedroom fully detached house with a private pool and large garden.', 5,5,4,155000000,'total','chevron',1),
  (33, 'felix.okon',  'request',  'looking_to_buy',      36, 'Looking to buy a duplex in Ikeja GRA, ready or under construction fine.', NULL,NULL,NULL,NULL,NULL,'ikeja-gra',0),
  (34, 'boyd.from',   'general',  NULL,                  40, 'Threw a small housewarming party last weekend, great turnout!', NULL,NULL,NULL,NULL,NULL,NULL,1),
  (35, 'maurice.u',   'property', 'for_rent',            45, 'Compact 1-bedroom apartment, newly painted, close to the expressway.', 1,1,1,1100000,'per_annum','sangotedo',0);

INSERT INTO posts (author_id, post_type, transaction_type, body, location_id, bedrooms, bathrooms, parking_spaces, price_amount, price_period, created_at)
SELECT u.id, t.post_type::post_type, t.transaction_type::transaction_type, t.body, l.id,
       t.bedrooms, t.bathrooms, t.parking_spaces, t.price_amount, t.price_period::price_period,
       now() - (t.days_ago || ' days')::interval
FROM tmp_extra_posts t
JOIN users u ON u.username = t.author
LEFT JOIN locations l ON l.slug = t.loc_slug;

-- media for the extra posts that have any (matched back by body, unique per row)
INSERT INTO post_media (post_id, media_type, storage_path, public_url, width_px, height_px, position)
SELECT p.id, 'image'::media_type,
       format('seed/post-%s-%s.webp', t.idx, gs.n),
       format('https://picsum.photos/seed/post-%s-%s/1600/1067', t.idx, gs.n),
       1600, 1067, gs.n - 1
FROM tmp_extra_posts t
JOIN posts p ON p.body = t.body
CROSS JOIN LATERAL generate_series(1, t.media_count) AS gs(n)
WHERE t.media_count > 0;

-- ══ comments (~25 total) ═══════════════════════════════════════════════
-- Post 2 gets exactly 7 (6 root + 1 reply) so "View all 7 comments" is real.
-- depth and root_comment_id are never set here — the Part 5 trigger derives both.
INSERT INTO comments (post_id, author_id, body, created_at) VALUES
  ('20000000-0000-0000-0000-000000000002', (SELECT id FROM users WHERE username = 'tunde_b'),     'Roads around Admiralty are still bad, my car nearly got stuck yesterday.', now() - interval '4 minutes'),
  ('20000000-0000-0000-0000-000000000002', (SELECT id FROM users WHERE username = 'felix.okon'),  'Same here, hopefully they fix the drainage before the next rain.', now() - interval '3 minutes 50 seconds'),
  ('20000000-0000-0000-0000-000000000002', (SELECT id FROM users WHERE username = 'jordan'),      'Stay safe everyone, avoid the flooded routes if you can.', now() - interval '3 minutes 40 seconds'),
  ('20000000-0000-0000-0000-000000000002', (SELECT id FROM users WHERE username = 'taylor'),      'This happens every year around this time.', now() - interval '3 minutes 30 seconds'),
  ('20000000-0000-0000-0000-000000000002', (SELECT id FROM users WHERE username = 'jamie'),       'Anyone know if LASG has been notified?', now() - interval '3 minutes 20 seconds'),
  ('20000000-0000-0000-0000-000000000002', (SELECT id FROM users WHERE username = 'ramosrealty'), 'We''ve had reports from clients in the area too.', now() - interval '3 minutes 10 seconds');

INSERT INTO comments (post_id, author_id, parent_comment_id, body, created_at)
SELECT '20000000-0000-0000-0000-000000000002', (SELECT id FROM users WHERE username = 'boyd.from'),
       (SELECT id FROM comments WHERE post_id = '20000000-0000-0000-0000-000000000002' AND author_id = (SELECT id FROM users WHERE username = 'tunde_b')),
       'Same experience near the roundabout, it''s really bad this year.', now() - interval '3 minutes';

-- posts 1, 3, 4, 5
INSERT INTO comments (post_id, author_id, body, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', (SELECT id FROM users WHERE username = 'maurice.u'),   'I have a 2-bedroom in Akoka coming up, will DM you.', now() - interval '20 seconds'),
  ('20000000-0000-0000-0000-000000000001', (SELECT id FROM users WHERE username = 'jordan'),      'Check Yaba too, a few good options around there.', now() - interval '10 seconds'),
  ('20000000-0000-0000-0000-000000000003', (SELECT id FROM users WHERE username = 'tunde_b'),     'Is the parking secured?', now() - interval '100 minutes'),
  ('20000000-0000-0000-0000-000000000003', (SELECT id FROM users WHERE username = 'jamie'),       'Beautiful kitchen, is this still available?', now() - interval '90 minutes'),
  ('20000000-0000-0000-0000-000000000003', (SELECT id FROM users WHERE username = 'taylor'),      'What''s the service charge like?', now() - interval '80 minutes'),
  ('20000000-0000-0000-0000-000000000003', (SELECT id FROM users WHERE username = 'jordan'),      'Great location, close to everything.', now() - interval '70 minutes'),
  ('20000000-0000-0000-0000-000000000003', (SELECT id FROM users WHERE username = 'maurice.u'),   'How many units in the compound?', now() - interval '60 minutes'),
  ('20000000-0000-0000-0000-000000000004', (SELECT id FROM users WHERE username = 'boyd.from'),   'I might have something opening up soon, will keep you posted.', now() - interval '20 hours'),
  ('20000000-0000-0000-0000-000000000005', (SELECT id FROM users WHERE username = 'taylor'),      'Video looks great, what''s the asking price?', now() - interval '2 days'),
  ('20000000-0000-0000-0000-000000000005', (SELECT id FROM users WHERE username = 'jamie'),       'Is this negotiable at all?', now() - interval '1 day');

-- three of the extra posts (idx 2, 3, 7)
INSERT INTO comments (post_id, author_id, body, created_at)
SELECT p.id, (SELECT id FROM users WHERE username = c.author), c.body, p.created_at + (c.offset_minutes || ' minutes')::interval
FROM (VALUES
  (2, 'taylor',     'Does this come with a backup generator too?', 30),
  (2, 'jamie',      'Which estate is this in exactly?', 45),
  (2, 'miracle.h',  'Looks nice, can you share more photos?', 60),
  (3, 'jordan',     'Is the C of O genuine, has it been verified?', 20),
  (3, 'ramosrealty','What''s the asking price for this one?', 35),
  (3, 'felix.okon', 'Great size for a family home.', 50),
  (7, 'maurice.u',  'How far is this from the tollgate exactly?', 25),
  (7, 'jamie',      'Ensuite rooms are a big plus, is it still available?', 40)
) AS c(idx, author, body, offset_minutes)
JOIN tmp_extra_posts t ON t.idx = c.idx
JOIN posts p ON p.body = t.body;

-- ══ likes (~150-170 total) ════════════════════════════════════════════
-- Post 3 gets exactly 23 distinct likers, guaranteed to include miracle.h
-- (ranked first via the boolean sort trick below, ahead of the alphabetical
-- fill from the rest of the 30 seeded users).
INSERT INTO post_likes (post_id, user_id, created_at)
SELECT '20000000-0000-0000-0000-000000000003', id, now() - (rn || ' minutes')::interval
FROM (
  SELECT id, row_number() OVER (ORDER BY (username = 'miracle.h') DESC, username) AS rn
  FROM users
) ranked
WHERE rn <= 23;

-- post 2: 8 of the 9 named users (all but jamie) — excludes filler.* too
INSERT INTO post_likes (post_id, user_id, created_at)
SELECT '20000000-0000-0000-0000-000000000002', id, now() - (row_number() OVER (ORDER BY username) || ' minutes')::interval
FROM users WHERE username <> 'jamie' AND username NOT LIKE 'filler.%';

-- posts 1 and 4: 1 like each
INSERT INTO post_likes (post_id, user_id, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now() - interval '15 seconds'),
  ('20000000-0000-0000-0000-000000000004', (SELECT id FROM users WHERE username = 'boyd.from'), now() - interval '21 hours');

-- post 5: a handful, including miracle.h
INSERT INTO post_likes (post_id, user_id, created_at) VALUES
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', now() - interval '2 days 12 hours'),
  ('20000000-0000-0000-0000-000000000005', (SELECT id FROM users WHERE username = 'taylor'), now() - interval '2 days'),
  ('20000000-0000-0000-0000-000000000005', (SELECT id FROM users WHERE username = 'jamie'),  now() - interval '1 day');

-- extra posts: a deterministic ~1/3 subset of (post, user) pairs, so the
-- feed has visible variety and miracle.h (row_number 6 alphabetically)
-- shows up liking roughly a third of them. Scoped to the original 9 named
-- users (not the filler.* padding users) to keep this distribution as it
-- was before the filler-user amendment.
INSERT INTO post_likes (post_id, user_id, created_at)
SELECT p.id, ur.id, now() - ((t.idx + ur.rn) || ' hours')::interval
FROM tmp_extra_posts t
JOIN posts p ON p.body = t.body
CROSS JOIN (
  SELECT id, row_number() OVER (ORDER BY username) AS rn
  FROM users WHERE username NOT LIKE 'filler.%'
) ur
WHERE (t.idx + ur.rn) % 3 = 0;

-- ══ stories (5) ═════════════════════════════════════════════════════════
-- expires_at is left to its default (now() + 24h) so every story is live.
INSERT INTO stories (author_id, storage_path, public_url) VALUES
  ((SELECT id FROM users WHERE username = 'ramosrealty'), 'seed/story-ramosrealty.jpg', 'https://picsum.photos/seed/story-ramosrealty/1080/1920'),
  ((SELECT id FROM users WHERE username = 'jordan'),      'seed/story-jordan.jpg',      'https://picsum.photos/seed/story-jordan/1080/1920'),
  ((SELECT id FROM users WHERE username = 'taylor'),      'seed/story-taylor.jpg',      'https://picsum.photos/seed/story-taylor/1080/1920'),
  ((SELECT id FROM users WHERE username = 'jamie'),       'seed/story-jamie.jpg',       'https://picsum.photos/seed/story-jamie/1080/1920'),
  ((SELECT id FROM users WHERE username = 'felix.okon'),  'seed/story-felix.jpg',       'https://picsum.photos/seed/story-felix/1080/1920');

-- miracle.h has viewed 2 of the 5 stories; the other 3 stay unseen.
INSERT INTO story_views (story_id, viewer_id)
SELECT s.id, '00000000-0000-0000-0000-000000000001'
FROM stories s
JOIN users u ON u.id = s.author_id
WHERE u.username IN ('ramosrealty', 'jordan');

-- Recompute like_count, comment_count, media_count and reply_count from
-- their source tables. Never touches view_count, share_count or
-- bookmark_count (no source table exists for those — Part 6 probe AE).
SELECT recompute_post_counters();

COMMIT;
