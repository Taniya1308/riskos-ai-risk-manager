-- RISKOS Supabase Schema
-- Run this in your Supabase SQL editor to set up persistent storage.
-- The app works without this (uses in-memory fallback), but Supabase
-- enables Realtime subscriptions and data persistence across restarts.

-- ── Transactions ──────────────────────────────────────────────────────────
create table if not exists transactions (
  id                  uuid primary key default gen_random_uuid(),
  razorpay_payment_id text unique not null,
  customer_id         text,
  amount              numeric(12, 2) not null,
  currency            text not null default 'INR',
  status              text not null,
  device_id           text,
  location_id         text,
  created_at          timestamptz not null default now()
);

-- ── Risk Scores ───────────────────────────────────────────────────────────
create table if not exists risk_scores (
  id                  uuid primary key default gen_random_uuid(),
  transaction_id      uuid references transactions(id) on delete cascade,
  score               integer not null check (score >= 0 and score <= 100),
  severity            text not null check (severity in ('low', 'medium', 'high', 'critical')),
  signals             jsonb,         -- array of {label, score, weight, reason, severity}
  triggered_rules     text[],        -- e.g. ['RULE_HIGH_AMOUNT', 'RULE_SUSPICIOUS_DEVICE']
  recommended_action  text check (recommended_action in ('APPROVE', 'REVIEW', 'HOLD', 'BLOCK')),
  created_at          timestamptz not null default now()
);

-- ── Risk Cases ────────────────────────────────────────────────────────────
create table if not exists risk_cases (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid references transactions(id) on delete cascade,
  risk_score_id   uuid references risk_scores(id) on delete set null,
  status          text not null default 'new'
                    check (status in ('new', 'approved', 'blocked', 'escalated')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-update updated_at on status change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists risk_cases_updated_at on risk_cases;
create trigger risk_cases_updated_at
  before update on risk_cases
  for each row execute function update_updated_at();

-- ── Audit Logs ────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references risk_cases(id) on delete cascade,
  actor       text not null,      -- 'system_agent' | analyst identifier
  action      text not null,      -- e.g. 'AUTOMATED_CASE_CREATED', 'DECISION_APPROVED'
  metadata    jsonb,              -- ai_investigation, score breakdown, timestamps, etc.
  created_at  timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_transactions_razorpay_id on transactions(razorpay_payment_id);
create index if not exists idx_transactions_customer    on transactions(customer_id);
create index if not exists idx_risk_scores_txn          on risk_scores(transaction_id);
create index if not exists idx_risk_cases_status        on risk_cases(status);
create index if not exists idx_risk_cases_created       on risk_cases(created_at desc);
create index if not exists idx_audit_logs_case          on audit_logs(case_id);
create index if not exists idx_audit_logs_created       on audit_logs(created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────
-- Enable RLS on all tables. The service role key (used server-side) bypasses RLS.
-- The anon key (used client-side for Realtime) only needs SELECT on risk_cases.

alter table transactions  enable row level security;
alter table risk_scores   enable row level security;
alter table risk_cases    enable row level security;
alter table audit_logs    enable row level security;

-- Allow anon to read risk_cases for Realtime subscription on the dashboard
create policy "anon_read_risk_cases"
  on risk_cases for select
  to anon
  using (true);

-- Allow anon to read audit_logs for case detail view
create policy "anon_read_audit_logs"
  on audit_logs for select
  to anon
  using (true);

-- Allow anon to read transactions (needed for case joins)
create policy "anon_read_transactions"
  on transactions for select
  to anon
  using (true);

-- Allow anon to read risk_scores (needed for case joins)
create policy "anon_read_risk_scores"
  on risk_scores for select
  to anon
  using (true);

-- ── Realtime ──────────────────────────────────────────────────────────────
-- Enable Realtime on risk_cases so the dashboard auto-refreshes.
-- Run in Supabase dashboard: Database → Replication → enable 'risk_cases' table.
-- Or uncomment the line below if your Supabase version supports it via SQL:
-- alter publication supabase_realtime add table risk_cases;
