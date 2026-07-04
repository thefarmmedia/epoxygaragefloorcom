-- EpoxyGarageFloors.ai — Supabase schema
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "uuid-ossp";

-- Contractors: every installer in the network, free or premium.
create table if not exists contractors (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text not null,
  email text not null unique,
  phone text not null,
  city text not null,
  state text not null,              -- 2-letter USPS code, e.g. 'MO'
  service_states text[] not null default '{}', -- states this contractor accepts leads from (defaults to home state)
  service_radius_miles integer default 50,
  years_in_business integer,
  license_number text,
  insured boolean not null default false,
  website text,
  notes text,
  tier text not null default 'free' check (tier in ('free', 'premium')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  stripe_customer_id text,
  stripe_subscription_id text,
  last_matched_at timestamptz,       -- used to round-robin premium leads within a state
  created_at timestamptz not null default now()
);

create index if not exists idx_contractors_state on contractors (state);
create index if not exists idx_contractors_tier_status on contractors (tier, status);

-- Leads: every homeowner quote request.
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text not null,
  phone text not null,
  zip text not null,
  city text,
  state text not null,
  garage_size text not null,        -- '1car' | '2car' | '3car' | '4car'
  floor_condition text not null,    -- 'good' | 'minor' | 'major'
  coating_interest text not null,   -- 'solid' | 'flake' | 'metallic' | 'notsure'
  timeline text not null,           -- 'asap' | '1-3mo' | '3-6mo' | 'researching'
  price_low integer not null,
  price_high integer not null,
  matched_contractor_id uuid references contractors (id),
  match_tier text,                  -- 'premium' | 'free' | 'unmatched'
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_state on leads (state);
create index if not exists idx_leads_matched_contractor on leads (matched_contractor_id);

-- Row Level Security: service-role key (used only by Netlify Functions) bypasses RLS.
-- Authenticated contractors may only read/update their own row and their own leads.
alter table contractors enable row level security;
alter table leads enable row level security;

create policy "Contractors read own profile" on contractors
  for select using (auth.jwt() ->> 'email' = email);

create policy "Contractors update own profile" on contractors
  for update using (auth.jwt() ->> 'email' = email);

create policy "Contractors read own leads" on leads
  for select using (
    matched_contractor_id in (
      select id from contractors where contractors.email = auth.jwt() ->> 'email'
    )
  );
