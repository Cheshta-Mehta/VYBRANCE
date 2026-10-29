# SunoSuraksha SMS relay
A browser page cannot send SMS safely (provider secrets would be exposed). This tiny server holds them.
Zero npm dependencies; needs Node 20.6+.

1. `cp .env.example .env`, set `API_KEY` (16+ chars). Keep `PROVIDER=mock` first.
2. `npm start`, then open the app and fill **SMS relay URL** (`http://localhost:8787`) and **API key**.
3. Press **Send test SMS**. With `mock` the app shows "mock: no SMS was sent".
4. For real SMS set `PROVIDER=twilio` plus `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`, `ALERT_TO`, restart.
   Twilio trial accounts only text numbers you have verified. India has DLT/sender rules, so check your provider.
5. The app sends SMS only for real (non-DEMO) High Risk and Critical events. "Accepted by Twilio" does not mean delivered.
Safeguards: API key, 4 KB body limit, input validation, per-alert cooldown (higher severity bypasses it), hourly cap.
The phone number and secrets live only in `.env` on the server. The API key in the browser is weak protection; the hourly cap limits abuse.
