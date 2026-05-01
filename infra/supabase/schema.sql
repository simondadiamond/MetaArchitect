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

-- End of schema v1.
