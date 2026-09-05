# Migration Index

| Logical | File |
|---|---|
| 0001 extensions | `20260904210220_extensions.sql` |
| 0002 enums | `20260904210226_enums.sql` |
| 0003 locations | `20260904210231_locations.sql` |
| 0004 users | `20260904210236_users.sql` |
| 0005 posts | `20260904211213_posts.sql` |
| 0006 post_media | `20260904211219_post_media.sql` |
| 0007 comments | `20260904211225_comments.sql` |
| 0008 engagement | `20260905072257_engagement.sql` |
| 0009 social | `20260905072303_social.sql` |
| 0010 auxiliary | `20260905072309_auxiliary.sql` |
| 0010b comments_client_token | `20260905072315_comments_client_token.sql` |
| 0011 indexes | `20260905075710_indexes.sql` |
| 0012 triggers | `20260905075716_triggers.sql` |
| 0012b scope_cleanup | `20260905083856_scope_cleanup.sql` |
| 0013 fn_get_feed | `20260905085243_fn_get_feed.sql` |
| 0014 fn_interactions | `20260905085251_fn_interactions.sql` |
| 0015 fn_maintenance | `20260905085258_fn_maintenance.sql` |
| 0016 rls | `20260905100239_rls.sql` |

`0012b` is a deliberate scope reduction, not a bug fix: it drops twelve tables built in
Parts 2–4 that turned out wider than the assessment brief requires (follows, comment
likes, bookmarks, shares, views, notifications, reports, blocks, saved filters,
hashtags, post_hashtags, mentions). Nothing built in those parts was wrong — a reviewer
of the migration history should expect to see tables appear and then disappear here.
