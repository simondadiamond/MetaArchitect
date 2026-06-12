-- The Meta Architect — Pipeline Schema (Supabase)
-- Version: 1 (initial)  | Created: 2026-04-26
-- Notes:
--   • Mirrors Airtable base appgvQDqiFZ3ESigA into the `pipeline` schema.
--   • Coexists with simonparis-website's `public` schema in the same project.
--   • Every table carries `airtable_record_id` for the 1-week fallback / cross-ref window.
--     Drop those columns after Airtable is decommissioned.
--   • Multi-link Airtable fields → `uuid[]` arrays (no FK enforcement, mirrors source).
--   • Single-link Airtable fields → `uuid REFERENCES …(id) ON DELETE SET NULL`.
--   • Airtable AI computed fields ("Summary (AI)", "Next Best Action (AI)") deliberately
--     omitted — re-derive in app code if needed.
--
-- Apply via Supabase MCP execute_sql (one-shot DDL only — runtime data ops use tools/supabase.mjs).

CREATE SCHEMA IF NOT EXISTS pipeline;

-- =====================================================================
-- updated_at trigger (shared)
-- =====================================================================
CREATE OR REPLACE FUNCTION pipeline.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 1) brand
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.brand (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id  text UNIQUE,
  name                text NOT NULL,
  colors              text,
  typography          text,
  goals               text,
  icp_short           text,
  icp_long            text,
  main_guidelines     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER brand_set_updated_at BEFORE UPDATE ON pipeline.brand
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 2) ideas
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.ideas (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id          text UNIQUE,
  topic                       text NOT NULL,
  status                      text,                   -- New | Selected | Ready | Completed | Research_failed
  intelligence_file           text,                   -- UIF JSON string
  source                      text,
  idea_tags                   text[],
  workflow_id                 text,
  source_type                 text,                   -- text | youtube | blog
  raw_input                   text,
  intent                      text,                   -- authority | education | community | virality
  content_brief               text,                   -- JSON string
  score_brand_fit             numeric,
  score_originality           numeric,
  score_monetization          numeric,
  score_production_effort     numeric,
  score_virality              numeric,
  score_authority             numeric,
  score_overall               numeric,
  score_rationales            text,                   -- JSON string
  recommended_next_action     text,
  captured_at                 timestamptz,
  selected_at                 timestamptz,
  research_started_at         timestamptz,            -- legacy ideas-level lock
  research_completed_at       timestamptz,
  planned_week                text,
  planned_order               numeric,
  narrative_role              text,
  series_id                   text,
  series_part                 numeric,
  series_total                numeric,
  selection_reason            text,
  research_depth              text,                   -- shallow | deep
  notebook_id                 text,
  mined_at                    timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ideas_status_idx          ON pipeline.ideas (status);
CREATE INDEX IF NOT EXISTS ideas_planned_week_idx    ON pipeline.ideas (planned_week);
CREATE TRIGGER ideas_set_updated_at BEFORE UPDATE ON pipeline.ideas
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 3) framework_library
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.framework_library (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id   text UNIQUE,
  framework_name       text NOT NULL,
  pattern_type         text,
  template             text,
  best_for             text[],
  avg_score            numeric,
  use_count            numeric DEFAULT 0,
  status               text,
  avg_impressions      numeric,
  avg_engagement_rate  numeric,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER framework_library_set_updated_at BEFORE UPDATE ON pipeline.framework_library
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 4) humanity_snippets
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.humanity_snippets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id   text UNIQUE,
  snippet_text         text NOT NULL,
  tags                 text[],
  used_count           numeric DEFAULT 0,
  avg_score            numeric,
  avg_impressions      numeric,
  avg_engagement_rate  numeric,
  last_used_at         timestamptz,
  status               text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER humanity_snippets_set_updated_at BEFORE UPDATE ON pipeline.humanity_snippets
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 5) hooks_library
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.hooks_library (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id    text UNIQUE,
  hook_text             text NOT NULL,
  hook_type             text,            -- contrarian | stat_lead | question | story_open | provocative_claim
  source_idea_id        uuid REFERENCES pipeline.ideas(id) ON DELETE SET NULL,
  angle_name            text,
  avg_score             numeric,
  use_count             numeric DEFAULT 0,
  status                text,            -- candidate | proven | retired
  avg_impressions       numeric,
  avg_engagement_rate   numeric,
  intent                text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hooks_status_idx       ON pipeline.hooks_library (status);
CREATE INDEX IF NOT EXISTS hooks_source_idea_idx  ON pipeline.hooks_library (source_idea_id);
CREATE TRIGGER hooks_library_set_updated_at BEFORE UPDATE ON pipeline.hooks_library
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 6) posts
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.posts (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id       text UNIQUE,
  format                   text,
  status                   text,                  -- planned | researching | research_ready | drafted | approved | rejected | published | scored
  idea_id                  uuid REFERENCES pipeline.ideas(id) ON DELETE SET NULL,
  platform                 text,                  -- linkedin | twitter
  intent                   text,
  content_brief            text,
  draft_content            text,
  humanity_snippet_id      uuid REFERENCES pipeline.humanity_snippets(id) ON DELETE SET NULL,
  alt_snippet_ids          uuid[],
  snippet_fit_score        numeric,
  hook_id                  uuid REFERENCES pipeline.hooks_library(id) ON DELETE SET NULL,
  framework_id             uuid REFERENCES pipeline.framework_library(id) ON DELETE SET NULL,
  post_url                 text,
  performance_score        numeric,
  score_source             text,                  -- manual | metrics | metrics_override
  impressions              numeric,
  likes                    numeric,
  comments                 numeric,
  shares                   numeric,
  saves                    numeric,
  drafted_at               timestamptz,
  reviewed_at              timestamptz,
  approved_at              timestamptz,
  published_at             timestamptz,
  needs_snippet            boolean DEFAULT false,
  planned_week             text,
  planned_order            numeric,
  narrative_role           text,
  angle_index              numeric,
  series_id                text,
  series_part              numeric,
  series_total             numeric,
  selection_reason         text,
  research_started_at      timestamptz,           -- LOCK FIELD for /research
  research_completed_at    timestamptz,
  pillar                   text,
  thesis_angle             text,
  source_angle_name        text,
  post_class               text,
  territory_key            text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_status_idx        ON pipeline.posts (status);
CREATE INDEX IF NOT EXISTS posts_idea_id_idx       ON pipeline.posts (idea_id);
CREATE INDEX IF NOT EXISTS posts_planned_week_idx  ON pipeline.posts (planned_week);
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON pipeline.posts
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 7) logs (STATE — Traceable)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id text UNIQUE,
  workflow_id     text NOT NULL,
  entity_id       text,
  step_name       text NOT NULL,
  stage           text,
  timestamp       timestamptz NOT NULL DEFAULT now(),
  output_summary  text,
  model_version   text,
  status          text NOT NULL,        -- success | error
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS logs_workflow_id_idx  ON pipeline.logs (workflow_id);
CREATE INDEX IF NOT EXISTS logs_entity_id_idx    ON pipeline.logs (entity_id);
CREATE INDEX IF NOT EXISTS logs_timestamp_idx    ON pipeline.logs (timestamp DESC);

-- =====================================================================
-- 8) sessions (used by /pattern + pattern-guardian)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.sessions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id          text UNIQUE,
  date                        date,
  core_insight                text,
  related_humanity_snippet    uuid[],   -- multipleRecordLinks → humanity_snippets
  icp_pain                    text,
  tags                        text[],
  pattern_confidence          text,
  full_log                    text,
  status                      text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON pipeline.sessions
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 9) blog_ideas (Plan 5 prep)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.blog_ideas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic           text NOT NULL,
  angle           text,
  pillar          text,
  source_idea_id  uuid REFERENCES pipeline.ideas(id) ON DELETE SET NULL,
  status          text DEFAULT 'idea',   -- idea | drafted | reviewed | scheduled
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER blog_ideas_set_updated_at BEFORE UPDATE ON pipeline.blog_ideas
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 10) blog_posts (Plan 5 prep)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  body_markdown   text NOT NULL,
  excerpt         text,
  seo_title       text,
  seo_description text,
  og_image        text,
  locale          text NOT NULL DEFAULT 'en',
  pillar          text,
  source_idea_id  uuid REFERENCES pipeline.ideas(id) ON DELETE SET NULL,
  blog_idea_id    uuid REFERENCES pipeline.blog_ideas(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'draft', -- draft | published | archived
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx        ON pipeline.blog_posts (status);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx  ON pipeline.blog_posts (published_at DESC);
CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON pipeline.blog_posts
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 11) engagement_targets (Plan 3 prep — LinkedIn watchlist)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.engagement_targets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_url         text UNIQUE NOT NULL,
  display_name        text,
  notes               text,
  priority            text,             -- p0 | p1 | p2
  active              boolean NOT NULL DEFAULT true,
  last_checked_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER engagement_targets_set_updated_at BEFORE UPDATE ON pipeline.engagement_targets
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 12) engagement_opportunities (Plan 3 prep — drafted comments)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pipeline.engagement_opportunities (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id            uuid REFERENCES pipeline.engagement_targets(id) ON DELETE SET NULL,
  source               text,             -- watchlist | discovery
  post_url             text NOT NULL,
  author               text,
  body_excerpt         text,
  posted_at            timestamptz,
  detected_at          timestamptz NOT NULL DEFAULT now(),
  drafted_comment      text,
  comment_intent       text,             -- authority | education | community | provocation
  status               text NOT NULL DEFAULT 'drafted', -- drafted | approved | skipped | posted | expired
  reviewed_at          timestamptz,
  posted_at_external   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS engagement_status_idx     ON pipeline.engagement_opportunities (status);
CREATE INDEX IF NOT EXISTS engagement_detected_idx   ON pipeline.engagement_opportunities (detected_at DESC);
CREATE TRIGGER engagement_opportunities_set_updated_at BEFORE UPDATE ON pipeline.engagement_opportunities
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- RLS — service role only (no anon access to pipeline schema)
-- =====================================================================
-- The website's NEXT_PUBLIC_SUPABASE_ANON_KEY must NOT be able to read pipeline.*
-- We rely on the default behavior: the `pipeline` schema is not exposed to PostgREST
-- unless added to the API config. Confirm in Supabase Dashboard → Settings → API →
-- Exposed schemas. Keep it set to `public` only.
--
-- For belt-and-suspenders, enable RLS on every table and grant nothing to anon/authenticated.
ALTER TABLE pipeline.brand                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.ideas                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.framework_library         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.humanity_snippets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.hooks_library             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.posts                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.logs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.sessions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.blog_ideas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.blog_posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.engagement_targets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.engagement_opportunities  ENABLE ROW LEVEL SECURITY;
-- service_role bypasses RLS by default — no policies needed for the migration script
-- or tools/supabase.mjs running with SUPABASE_SERVICE_ROLE_KEY.

-- =====================================================================
-- 13) teardown_candidates
-- =====================================================================
-- Lightweight metadata for candidate production AI systems.
-- Written by /teardown-research skill. Read by admin panel + /teardown-generate.
-- pipeline schema is NOT exposed to PostgREST — access via Management API SQL or CLI only.
CREATE TABLE IF NOT EXISTS pipeline.teardown_candidates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  company               text,
  category              text,             -- enterprise_search | rag | agentic | orchestration | chatbot | customer_service | finserv_ai | healthcare_ai
  description           text,             -- 2-3 sentences: what it does, who uses it, how
  primary_source_url    text,
  sources               jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{url, type, title}]
  icp_relevance         int CHECK (icp_relevance   BETWEEN 1 AND 5),   -- LLM Platform/Reliability Leader cares? (primary filter ≥3)
  content_yield         int CHECK (content_yield  BETWEEN 1 AND 5),   -- insight density × extractability: rich gaps + standalone LinkedIn post possible (filter ≥3)
  public_info_depth     text CHECK (public_info_depth IN ('shallow', 'medium', 'deep')),
  state_s_score         int CHECK (state_s_score   BETWEEN 0 AND 2),  -- Structured
  state_t_score         int CHECK (state_t_score   BETWEEN 0 AND 2),  -- Traceable
  state_a_score         int CHECK (state_a_score   BETWEEN 0 AND 2),  -- Auditable
  state_tol_score       int CHECK (state_tol_score BETWEEN 0 AND 2),  -- Tolerant
  state_e_score         int CHECK (state_e_score   BETWEEN 0 AND 2),  -- Explicit
  interesting_gap       text,             -- 1-2 sentences: most interesting inferable STATE violation
  teardown_angle        text,             -- recommended narrative angle (strong enough to be a LinkedIn hook)
  status                text NOT NULL DEFAULT 'candidate'
                          CHECK (status IN ('candidate', 'selected', 'in_teardown', 'published', 'skipped')),
  skip_reason           text,
  workflow_id           text,             -- traceable: which research run inserted this row
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teardown_candidates_status_idx  ON pipeline.teardown_candidates (status);
CREATE INDEX IF NOT EXISTS teardown_candidates_icp_idx     ON pipeline.teardown_candidates (icp_relevance DESC NULLS LAST);
CREATE TRIGGER teardown_candidates_set_updated_at BEFORE UPDATE ON pipeline.teardown_candidates
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

-- =====================================================================
-- 14) teardown_drafts
-- =====================================================================
-- Full teardown content — separated from candidates because body is large.
-- Written by /teardown-generate (not yet built). One draft per candidate (soft constraint).
CREATE TABLE IF NOT EXISTS pipeline.teardown_drafts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id          uuid REFERENCES pipeline.teardown_candidates(id) ON DELETE SET NULL,
  system_summary        text,             -- final system description used as generation input
  interview_answers     jsonb NOT NULL DEFAULT '{}'::jsonb,   -- Simon's guided-mode answers if used
  state_scores          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {s:{score,reasoning}, t:{...}, a:{...}, tol:{...}, e:{...}}
  gaps                  jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{pillar, gap, consequence, severity}]
  remediation           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{pillar, recommendation, priority}]
  full_content          text,             -- full markdown teardown article
  linkedin_post         text,             -- repurposed LinkedIn post (150-250 words)
  post_angle            text,             -- "is there a LinkedIn post in this?" one-liner
  blog_slug             text,
  blog_url              text,
  published_at          timestamptz,
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'reviewed', 'published', 'archived')),
  workflow_id           text,             -- traceable
  generation_log        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- auditable: each LLM call logged {step, model, prompt_hash, output_summary}
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teardown_drafts_candidate_idx  ON pipeline.teardown_drafts (candidate_id);
CREATE INDEX IF NOT EXISTS teardown_drafts_status_idx     ON pipeline.teardown_drafts (status);
CREATE TRIGGER teardown_drafts_set_updated_at BEFORE UPDATE ON pipeline.teardown_drafts
  FOR EACH ROW EXECUTE FUNCTION pipeline.set_updated_at();

ALTER TABLE pipeline.teardown_candidates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline.teardown_drafts      ENABLE ROW LEVEL SECURITY;
-- service_role bypasses RLS — same policy as all other pipeline.* tables.

-- End of schema v1 + teardown extension (added 2026-06-03).
