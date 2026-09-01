# RISKOS — AI Risk Manager

> Autonomous payment fraud detection for Razorpay, powered by Google Gemini.

RISKOS intercepts Razorpay webhooks, scores payments across **6 AI signals**, investigates with **Gemini 1.5 Flash**, auto-blocks fraud, and issues **automatic refunds** — before a human sees it.

Built for **Razorpay AI Builder Buildathon · Track 2**

---

## Demo

```bash
npm install && npm run dev
# Open http://localhost:3000/dashboard
```

**No setup needed — works out of the box with demo data.**

| Page | URL |
|---|---|
| Command Center | `/dashboard` |
| Analytics | `/analytics` |
| Rule Engine | `/rules` |

---

## How It Works

```
Razorpay Webhook → Verify Signature → 6-Signal Risk Score
                                              ↓
                                   Gemini AI Investigation
                                              ↓
                              Score ≥ 85 → Auto-Block + Refund
                              Score 40–84 → Analyst Review Queue
                                              ↓
                                     Immutable Audit Trail
```

---

## Risk Signals

| Signal | Weight | Detects |
|---|---|---|
| Transaction Amount | 30% | Abnormally high values |
| Payment Status | 25% | Failed or flagged payments |
| Device Fingerprint | 20% | Unknown devices, proxy patterns |
| Geo / IP | 15% | VPN, Tor, high-risk locations |
| Velocity | 5% | High-frequency transactions |
| Currency | 5% | Foreign currency on INR merchant |

Score **0–100** → `low` / `medium` / `high` / `critical`

---

## Key Features

- **Gemini AI** — structured JSON investigation on every payment (explanation, action, confidence)
- **AI Analyst Chat** — ask questions about any case, get context-aware answers
- **Auto-Block** — score ≥ 85 triggers instant block + Razorpay Refund API call
- **Bulk Actions** — approve/block/escalate multiple cases at once
- **Analytics** — 7-day fraud trends, top risk locations, score distribution
- **Rule Engine** — change thresholds and signal weights from UI, no code needed
- **CSV Export** — download filtered cases for compliance reporting
- **Case Notes** — analysts document reasoning before deciding
- **Supabase Realtime** — dashboard auto-updates on new cases

---

## Setup

**Minimum — activates real AI:**
```env
GEMINI_API_KEY=your_key_here
```
Get free at [aistudio.google.com](https://aistudio.google.com) — no credit card.

**Optional — persistent storage:**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Optional — live Razorpay refunds:**
```env
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks/razorpay` | Webhook intake — score, investigate, act |
| `GET/POST` | `/api/cases` | List cases / record decision |
| `POST` | `/api/cases/bulk` | Bulk approve / block / escalate |
| `GET` | `/api/cases/export` | Download as CSV |
| `POST` | `/api/chat` | AI analyst chat |
| `GET` | `/api/analytics` | Fraud trend data |
| `GET/POST` | `/api/rules` | Rule config and alert rules |
| `GET` | `/api/health` | System status |

---

## Tech Stack

**Next.js 16** · **TypeScript** · **Gemini 1.5 Flash** · **Razorpay API** · **Supabase** · **Tailwind CSS 4**

---

## Deploy

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add `GEMINI_API_KEY` as environment variable
4. Deploy → add your Vercel URL to Razorpay webhook settings
