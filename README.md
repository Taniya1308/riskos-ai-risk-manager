# RISKOS — AI Risk Manager
### Razorpay AI Builder · Track 2: AI Risk Manager

RISKOS is an autonomous payment risk operations platform built natively for Razorpay merchants. It intercepts payment webhooks in real time, scores them across six independent risk signals, runs a Gemini-powered AI investigation, and surfaces everything in a human-in-the-loop command center — with a full immutable audit trail and an AI analyst chat interface.

---

## Live Demo Flow (for judges)

1. Open **`/dashboard`** — you'll see 3 seeded demo cases pre-loaded
2. Click any case → explore the **AI Investigation**, **Signal Breakdown**, **Audit Trail**, and **Ask AI** tabs
3. Back on the dashboard, click **"🔴 Critical Risk"** to inject a live webhook event
4. Watch the new case appear in the queue, click it, see the Gemini investigation
5. Use the **Ask AI** tab to chat with the analyst: *"Why is this flagged?"*, *"What should I do?"*
6. Make a decision (Approve / Block / Escalate) and watch the audit trail update

---

## Architecture

```
Razorpay Payment Event
        │
        ▼
POST /api/webhooks/razorpay
  │  1. HMAC-SHA256 signature verification
  │  2. Extract payment entity (amount, device, location, customer)
  │  3. Multi-Signal Risk Engine  ──────────────────────────────┐
  │     • Amount Deviation (30%)                                 │
  │     • Payment Status  (25%)                                  │
  │     • Device Integrity(20%)                                  │  RiskEngineResult
  │     • Geo/IP Variance (15%)                                  │  (composite score,
  │     • Velocity        ( 5%)                                  │   signals[], rules[])
  │     • Currency Risk   ( 5%)                                  │
  │  4. Gemini 1.5 Flash AI Investigation ◄─────────────────────┘
  │     (structured JSON: explanation, action, factors, confidence)
  │  5. Persist to Supabase (or in-memory fallback)
  │  6. Create risk_case + audit_log
        │
        ▼
GET /api/cases  →  Dashboard  →  Analyst Review
                                    │
                          ┌─────────┼─────────┐
                          ▼         ▼         ▼
                    AI Investigation  Signal  Audit
                    (Gemini summary)  Bars    Trail
                          │
                          ▼
                    POST /api/chat  (Gemini multi-turn analyst Q&A)
                          │
                          ▼
                    POST /api/cases  (decision: approved/blocked/escalated)
                          │
                          ▼
                    Immutable Audit Log
```

---

## Features

### AI Layer
- **Gemini 1.5 Flash** — called in JSON output mode for structured, reproducible results
- **Explainable AI** — natural language summary of exactly why a transaction is suspicious, referencing specific signal values
- **Key Risk Factors** — 2–4 bullet points surfaced per case
- **Confidence scoring** — low / medium / high based on signal strength
- **AI Analyst Chat** — multi-turn Gemini conversation grounded in full case context
- **Graceful fallback** — all AI features degrade to deterministic analysis when no API key is set; the app is fully functional either way

### Risk Scoring Engine (6 signals, weighted composite)
| Signal | Weight | What it detects |
|---|---|---|
| Amount Deviation | 30% | Transactions above ₹25K–₹2L thresholds |
| Payment Status | 25% | Failed, refunded, or unrecognized status codes |
| Device Integrity | 20% | Unknown fingerprints, proxy/Tor tooling patterns |
| Geo / IP Variance | 15% | VPN, Tor exit nodes, high-risk location IDs |
| Velocity & Frequency | 5% | Anonymous customers, high-frequency session patterns |
| Currency Mismatch | 5% | Foreign currency on an INR merchant |

Composite score 0–100 → severity: `low` / `medium` / `high` / `critical`
Recommended action: `APPROVE` / `REVIEW` / `HOLD` / `BLOCK`

### Razorpay Integration
- Listens for `payment.authorized`, `payment.failed`, `payment.captured`
- Verifies `x-razorpay-signature` HMAC-SHA256 in production
- Webhook simulator on dashboard for live demos (no real Razorpay account needed)

### Human-in-the-Loop
- **Approve / Block / Escalate** decisions from the case modal
- Every action (automated + human) written to immutable audit trail
- Supabase Realtime subscription — dashboard auto-refreshes on new cases

### Storage
- **Supabase** — PostgreSQL + Realtime when credentials are provided
- **In-memory fallback** — fully functional without any DB; 3 seeded demo cases on startup

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| AI | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Database | Supabase (PostgreSQL + Realtime) |
| UI | React 19, Tailwind CSS 4, Lucide React |
| Fonts | Geist Sans + Geist Mono |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

The only **required** variable to unlock AI features is:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at [aistudio.google.com](https://aistudio.google.com) (generous free tier, no credit card).

Everything else is optional — the app runs fully without Supabase or Razorpay credentials.

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | For AI features | Google Gemini API key — get free at aistudio.google.com |
| `NEXT_PUBLIC_SUPABASE_URL` | For persistence | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For persistence | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | For server writes | Supabase service role key (server-side only) |
| `RAZORPAY_WEBHOOK_SECRET` | For production | Webhook secret from Razorpay dashboard |

---

## Supabase Schema

If you want persistent storage, run `schema.sql` in your Supabase SQL editor.
See [`schema.sql`](./schema.sql) in the project root.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/webhooks/razorpay` | Razorpay payment webhook intake |
| `GET` | `/api/cases` | List all risk cases |
| `POST` | `/api/cases` | Record analyst decision (approve/block/escalate) |
| `GET` | `/api/audit-logs?caseId=` | Get audit trail for a case |
| `POST` | `/api/investigate` | Run AI investigation on a transaction |
| `POST` | `/api/chat` | Multi-turn AI analyst chat for a case |

---

## Testing

Fire a signed test webhook against your local server:

```bash
npm run test:webhook
```

This sends a ₹85,000 payment from a VPN proxy device — should produce a critical-severity case.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── webhooks/razorpay/route.ts  # Webhook intake pipeline
│   │   ├── cases/route.ts              # Case CRUD + decisions
│   │   ├── investigate/route.ts        # On-demand AI investigation
│   │   ├── chat/route.ts               # AI analyst chat
│   │   └── audit-logs/route.ts         # Audit trail retrieval
│   ├── dashboard/page.tsx              # Main command center UI
│   └── page.tsx                        # Landing page
├── components/
│   └── RiskDetailsModal.tsx            # Case investigation modal (4 tabs)
└── lib/
    ├── risk-engine.ts                  # 6-signal weighted scoring engine
    ├── ai-investigation.ts             # Gemini integration + fallback
    ├── mock-store.ts                   # In-memory DB with demo seed data
    └── supabase.ts                     # Supabase client
```
