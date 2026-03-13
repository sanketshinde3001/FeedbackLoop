-- ============================================================
-- FeedbackLoop — Full Database Schema with RLS
-- Run this entire file in Supabase SQL Editor (once)
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Custom ENUM Types ──────────────────────────────────────
create type session_status as enum ('draft', 'active', 'closed');
create type sentiment_type as enum ('positive', 'neutral', 'negative');
create type emoji_type as enum ('loved_it', 'helpful', 'needs_improvement', 'confused');

-- ============================================================
-- TABLE: sessions
-- Owned by admin users (host_id = auth.uid())
-- ============================================================
create table sessions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  host_id       uuid not null references auth.users(id) on delete cascade,
  questions     text[] not null default '{}',
  status        session_status not null default 'draft',
  session_date  timestamptz,
  wall_enabled  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Index for fetching a host's sessions quickly
create index sessions_host_id_idx on sessions(host_id);

-- ─── RLS: sessions ─────────────────────────────────────────
alter table sessions enable row level security;

-- Admins can see only their own sessions
create policy "host can view own sessions"
  on sessions for select
  using (auth.uid() = host_id);

-- Admins can create sessions
create policy "host can create sessions"
  on sessions for insert
  with check (auth.uid() = host_id);

-- Admins can update their own sessions
create policy "host can update own sessions"
  on sessions for update
  using (auth.uid() = host_id);

-- Admins can delete their own sessions
create policy "host can delete own sessions"
  on sessions for delete
  using (auth.uid() = host_id);

-- Public can view sessions where wall is enabled (for /wall/[sessionId])
create policy "public can view wall-enabled sessions"
  on sessions for select
  using (wall_enabled = true);

-- ============================================================
-- TABLE: attendees
-- Managed by admin; attendees access the system via unique_token
-- All token-based operations go through server-side API routes
-- using the service role key — never direct client access
-- ============================================================
create table attendees (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  email         text not null,
  name          text not null,
  unique_token  text not null unique default encode(gen_random_bytes(32), 'hex'),
  reminded_at   timestamptz,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index attendees_session_id_idx on attendees(session_id);
create index attendees_unique_token_idx on attendees(unique_token);
-- Prevent duplicate email per session
create unique index attendees_session_email_uidx on attendees(session_id, email);

-- ─── RLS: attendees ────────────────────────────────────────
alter table attendees enable row level security;

-- Only the session host can manage attendees for their sessions
create policy "host can manage attendees"
  on attendees for all
  using (
    exists (
      select 1 from sessions
      where sessions.id = attendees.session_id
        and sessions.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions
      where sessions.id = attendees.session_id
        and sessions.host_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: responses
-- Video responses submitted by attendees
-- ============================================================
create table responses (
  id               uuid primary key default gen_random_uuid(),
  attendee_id      uuid not null references attendees(id) on delete cascade,
  session_id       uuid not null references sessions(id) on delete cascade,
  video_url        text,
  audio_language   text not null default 'en',
  edited_video_url text,
  caption_vtt_url  text,
  wall_video_source text not null default 'raw' check (wall_video_source in ('raw', 'edited')),
  transcript       text,
  sentiment        sentiment_type,
  sentiment_score  numeric(4, 3) check (sentiment_score between -1 and 1),
  approved_for_wall boolean not null default false,
  created_at       timestamptz not null default now()
);

create index responses_session_id_idx on responses(session_id);
create index responses_attendee_id_idx on responses(attendee_id);
-- One response per attendee per session
create unique index responses_attendee_session_uidx on responses(attendee_id, session_id);

-- ─── RLS: responses ────────────────────────────────────────
alter table responses enable row level security;

-- Session host can view all responses for their sessions
create policy "host can view session responses"
  on responses for select
  using (
    exists (
      select 1 from sessions
      where sessions.id = responses.session_id
        and sessions.host_id = auth.uid()
    )
  );

-- Session host can update responses (approve for wall, etc.)
create policy "host can update session responses"
  on responses for update
  using (
    exists (
      select 1 from sessions
      where sessions.id = responses.session_id
        and sessions.host_id = auth.uid()
    )
  );

-- Public can read wall-approved responses for wall-enabled sessions
create policy "public can view wall approved responses"
  on responses for select
  using (
    approved_for_wall = true
    and exists (
      select 1 from sessions
      where sessions.id = responses.session_id
        and sessions.wall_enabled = true
    )
  );

-- ============================================================
-- TABLE: reactions
-- Quick emoji reactions (can be done without recording)
-- ============================================================
create table reactions (
  id          uuid primary key default gen_random_uuid(),
  attendee_id uuid not null references attendees(id) on delete cascade,
  session_id  uuid not null references sessions(id) on delete cascade,
  emoji_type  emoji_type not null,
  created_at  timestamptz not null default now()
);

create index reactions_session_id_idx on reactions(session_id);
-- One reaction per attendee per session
create unique index reactions_attendee_session_uidx on reactions(attendee_id, session_id);

-- ─── RLS: reactions ────────────────────────────────────────
alter table reactions enable row level security;

-- Session host can view all reactions for their sessions
create policy "host can view session reactions"
  on reactions for select
  using (
    exists (
      select 1 from sessions
      where sessions.id = reactions.session_id
        and sessions.host_id = auth.uid()
    )
  );

-- ============================================================
-- HELPER FUNCTION: validate_attendee_token
-- Used by server-side API routes to resolve a token → attendee
-- Returns the attendee row if token is valid and session is active
-- ============================================================
create or replace function validate_attendee_token(p_token text)
returns table (
  attendee_id  uuid,
  session_id   uuid,
  attendee_name text,
  session_title text,
  questions    text[],
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    a.id          as attendee_id,
    s.id          as session_id,
    a.name        as attendee_name,
    s.title       as session_title,
    s.questions,
    a.submitted_at
  from attendees a
  join sessions s on s.id = a.session_id
  where a.unique_token = p_token
    and s.status = 'active';
end;
$$;

-- ============================================================
-- COMMENTS
-- ============================================================
comment on table sessions   is 'Webinar/event sessions created by admin users';
comment on table attendees  is 'Attendees invited to a session; access via unique_token';
comment on table responses  is 'Video responses submitted by attendees';
comment on table reactions  is 'Quick emoji reactions from attendees';
