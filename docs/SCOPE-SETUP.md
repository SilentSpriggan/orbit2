# SCOPE Gemini setup

SCOPE already uses the site's Node server to call Gemini via REST. No extra SDK or Python package is required. Existing npm dependencies must be installed (`npm ci` on a fresh checkout).

1. Create a key at https://aistudio.google.com/apikey.
2. Open `.env.local` in this project root and fill in `GEMINI_API_KEY=`. Keep `GEMINI_IMAGE_MODEL=gemini-3.8-flash` or choose a model available to your account.
3. Run `npm run dev` from this folder. Open http://localhost:5173.
4. Open http://localhost:5173/api/scope/status. `provider: gemini` means a key is configured, not that Google has validated it. This response never contains the key.
5. Switch the site to Online, open SCOPE, consent to sending the image, and try a drawn example to verify an actual API request.

Keep keys only in `.env.local` or the server process environment. Do not put them in `.env.live`, `.env.development`, browser JavaScript, or VITE_ variables. `.env.local` is ignored by Git. Process environment settings override the file. The file is read on each request.

With a blank key, SCOPE returns a labeled demo. Live photo analysis requires internet and sends the photo and note to Google. Account quota/billing and model access are managed in Google AI Studio. This setup does not change the offline features.

Run local tests: `node --test tests/photo-analysis.test.mjs` (mocked requests; no API key or image upload required).

For tablet camera use, configure trusted HTTPS and LAN access separately: the current site server listens on laptop localhost only. Uploading a photo on the laptop can be tested immediately.
