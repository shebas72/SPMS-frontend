# SPMS Frontend

React 18 + Vite SPA for the Strategy & Performance Management System. Talks to the Laravel API (`spms-backend`) over `/api/v1` with Sanctum tokens.

## Run

```bash
npm install
cp .env.example .env     # then set VITE_API_URL
npm run dev              # http://localhost:5173
```

Demo login (from the seeder): `manager1@spms.test` (check the password in your seeder).

## Languages

Controlled by `.env`:

```
VITE_ENABLED_LANGUAGES=en,ar   # or just: en
VITE_DEFAULT_LANGUAGE=en
```

- Only `en` listed: no language switcher is shown and the app stays LTR.
- More than one listed: a switcher appears in the header and on the login page. `<html lang>` and `dir` update automatically, and the Axios client sends an `Accept-Language` header.

Add a language:
1. Add an entry to `src/config/languages.js` (`dir: 'rtl'` for right-to-left scripts).
2. Copy `src/i18n/locales/en/translation.json` to `src/i18n/locales/<code>/translation.json` and translate it.
3. Add the code to `VITE_ENABLED_LANGUAGES`.

## RTL rules for new components

Use logical Tailwind classes so layouts flip with `dir`: `ms-*` / `me-*`, `ps-*` / `pe-*`, `start-*` / `end-*`, `text-start`, `border-s` / `border-e`. Avoid `ml-*`, `mr-*`, `left-*`, `right-*`. Flip direction-implying icons with `rtl:-scale-x-100`.

## Auth endpoints

Defined in one place: `src/features/auth/authApi.js` (`/auth/login`, `/auth/me`, `/auth/logout`). Change them there if your Laravel routes differ.

## Structure

```
src/
  config/languages.js     language registry + env switches
  i18n/                   i18next setup + locales/<code>/translation.json
  lib/api.js              Axios client (token, Accept-Language, 401 handling)
  stores/authStore.js     Zustand, persisted token + user
  features/auth/          login page + auth API
  components/             layout shell, protected route, language switcher, ui/
  pages/                  placeholder pages for the 8 modules
```
