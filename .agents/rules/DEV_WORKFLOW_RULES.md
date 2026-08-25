# TeleShop Staging & Production Development Workflow Rules

## 1. Frontend Development
- **Local Source ONLY**: All frontend code edits and feature development MUST be performed in the local device repository: `/home/meriko/teleshop-admin`.
- **Deployment**: NEVER edit `/var/www/teleshop-admin` on the VPS directly. Deploy tested builds using `npm run deploy` / `npm run sync-frontend`.

## 2. Backend Development
- **Staging Dev Server ONLY**: All backend code edits, route modifications, and bug fixes MUST be performed ONLY on the Staging Dev Backend: `/root/teleshop-dev` (Port 8001).
- **Live Production Protection**: NEVER edit the live production backend (`/root/teleshop-api`, Port 8000) directly.
- **Syncing**: Once backend changes are tested and approved, sync to live production using `sync-backend` (on VPS) or `npm run sync-backend` (on local device).

## 3. On-Demand Dev Server Control
- Turn **ON** staging with `dev-on` when testing backend features.
- Turn **OFF** staging with `dev-off` to free 100% of dev memory back to Linux when resting or finished.

## 4. Exceptions for Shared Live Services (`mmpay` & `Teleshop.py`)
- **ONLY WHEN NEEDED**: Shared services like `mmpay` (Payment Server) and `Teleshop.py` (Telegram Bot Engine) run on the Live Server. They may be read or edited directly on the Live Server **ONLY WHEN EXPLICITLY NEEDED**.
