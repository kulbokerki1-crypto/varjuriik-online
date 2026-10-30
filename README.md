# VARJURIIK v4 — multiplayer mafia/economy game

VARJURIIK v4 is the new beta base for the game. It is intended for deployment on Render with PostgreSQL persistence.

## Included now

- Accounts, hashed passwords, session invalidation and owner/admin roles
- Login rate limiting, temporary account lock, IP + user-agent login/security logs
- Optional e-mail password reset through SMTP plus admin temporary-password reset
- Persistent PostgreSQL game state when `DATABASE_URL` is configured
- Turns: configurable batch/interval, natural cap, admin-added turns may exceed cap
- Mafia/security to level 300, property to level 100, education and bank limits
- Weapons, troops, PvP limits, gang points, unprotected excess weapons
- Player banks, configurable loans and automatic default liquidation
- Businesses, car dealership/market, travel, maintenance costs
- Dynamic weapon/car market multipliers and admin market controls
- Crypto, lottery, global chat and play-money live Hold'em beta
- Wanted level, jail/bail, reputation and insurance
- Secret operations and player bounties
- Player profile privacy controls and expanded statistics
- Admin turn shop: custom package name, turns, price, payment method, free-text payment instructions, manual approve/reject
- Admin gifts to all active users (cash/turns/VIP days + message)
- Admin audit log, snapshots, owner-only rollback and economy simulation
- Admin security view for shared IP risk signals and password reset requests
- Owner/admin-only game-master handbook

## Important deployment variables

Copy `.env.example` values into Render environment variables. For persistent accounts/progress, configure `DATABASE_URL` from Render Postgres. Set a strong `OWNER_PASSWORD` and `TOKEN_SECRET`.

For e-mail password reset, also set `PUBLIC_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM`. If SMTP is not configured, a reset request still appears to admins and an admin can assign a temporary password.

## Notes

This is a large working beta, not a finished audited production platform. The current storage model keeps the whole game state in one PostgreSQL JSONB row, which is fine for early testing but should later be migrated to relational tables for larger player counts. Login throttling is in-memory, so for multiple web instances a shared Redis-style limiter would be better. Poker still does not implement full side-pot/reconnect handling.

Before public launch, run a dedicated security review, enable Render HTTPS, configure database backups, and test restores/rollback with a staging database.
