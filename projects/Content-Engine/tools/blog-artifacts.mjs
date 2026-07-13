// tools/blog-artifacts.mjs — blog pipeline artifacts + stage transitions (public schema).
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Walk up from this script to find .env (Content-Engine root).
{
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const p = resolve(dir, '.env');
    if (existsSync(p)) { config({ path: p, quiet: true }); break; }
    dir = resolve(dir, '..');
  }
}

export const MACHINE_STAGES = ['researching','outlining','drafting','editing','optimizing','fact_check','inserting'];
const STAGES = ['candidate', ...MACHINE_STAGES, 'awaiting_outline_approval','awaiting_final_review','promoted_to_post'];
const KINDS = ['research_doc','outline','writing_brief','draft','editorial_report','optimized_draft','factcheck_report'];

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('blog-artifacts.mjs: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
}

const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });

const okStage = s => STAGES.includes(s) || /^failed_[a-z_]+$/.test(s);

export async function getIdea(ideaId) {
  const { data, error } = await pub.from('blog_ideas').select('*').eq('id', ideaId).maybeSingle();
  if (error) throw error; return data;
}
export async function saveArtifact({ ideaId, kind, content, meta = {} }) {
  if (!KINDS.includes(kind)) throw new Error(`invalid artifact kind: ${kind}`);
  if (typeof content !== 'string' || !content.trim()) throw new Error('artifact content is empty');
  const { data, error } = await pub.from('blog_artifacts')
    .insert({ idea_id: ideaId, kind, content, meta }).select('id').single();
  if (error) throw error; return data.id;
}
export async function latestArtifact(ideaId, kind) {
  const { data, error } = await pub.from('blog_artifacts')
    .select('id, content, meta, created_at').eq('idea_id', ideaId).eq('kind', kind)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error; return data;
}
export async function setStage(ideaId, stage) {
  if (!okStage(stage)) throw new Error(`invalid stage: ${stage}`);
  const { error } = await pub.from('blog_ideas')
    .update({ stage, updated_at: new Date().toISOString() }).eq('id', ideaId);
  if (error) throw error;
}
export async function claimStage(ideaId, fromStage, toStage) {
  if (!okStage(toStage)) throw new Error(`invalid stage: ${toStage}`);
  const { data, error } = await pub.from('blog_ideas')
    .update({ stage: toStage, updated_at: new Date().toISOString() })
    .eq('id', ideaId).eq('stage', fromStage).select('id');
  if (error) throw error; return (data ?? []).length === 1;
}
export async function listActionable(limit = 10) {
  const { data, error } = await pub.from('blog_ideas')
    .select('id, title_working, pillar, post_type, stage, updated_at')
    .in('stage', MACHINE_STAGES).order('updated_at', { ascending: true }).limit(limit);
  if (error) throw error; return data ?? [];
}

// ============================================================
// Self-test: verify all functions work and clean up after
// ============================================================

if (process.argv[2] === '--self-test') {
  (async () => {
    let testIdeaId;
    try {
      // 1. Create a throwaway blog_ideas row
      const { data: ideaRow, error: createError } = await pub.from('blog_ideas')
        .insert({ title_working: 'SELF-TEST — delete me', stage: 'candidate' })
        .select('id').single();
      if (createError) throw new Error(`Failed to create test row: ${createError.message}`);
      testIdeaId = ideaRow.id;

      // 2. Test: invalid kind throws
      try {
        await saveArtifact({ ideaId: testIdeaId, kind: 'invalid_kind', content: 'test' });
        throw new Error('Expected saveArtifact to reject invalid kind');
      } catch (e) {
        if (!e.message.includes('invalid artifact kind')) throw e;
      }

      // 3. Test: save + latest round-trips
      const artifactId = await saveArtifact({
        ideaId: testIdeaId,
        kind: 'research_doc',
        content: 'Test research content',
        meta: { source: 'test' }
      });
      const fetched = await latestArtifact(testIdeaId, 'research_doc');
      if (!fetched || fetched.id !== artifactId || fetched.content !== 'Test research content') {
        throw new Error('saveArtifact / latestArtifact round-trip failed');
      }
      if (fetched.meta.source !== 'test') {
        throw new Error('artifact meta not preserved');
      }

      // 4. Test: claimStage from 'candidate' to 'researching' returns true
      const claimed = await claimStage(testIdeaId, 'candidate', 'researching');
      if (!claimed) throw new Error('First claimStage should return true');

      // 5. Test: repeat same claim returns false
      const reclaimed = await claimStage(testIdeaId, 'candidate', 'researching');
      if (reclaimed) throw new Error('Second claimStage with same fromStage should return false');

      // 6. Test: getIdea retrieves the updated row
      const idea = await getIdea(testIdeaId);
      if (!idea || idea.stage !== 'researching') {
        throw new Error('getIdea failed or stage not updated');
      }

      // 7. Test: setStage with invalid stage throws
      try {
        await setStage(testIdeaId, 'invalid_stage_name');
        throw new Error('Expected setStage to reject invalid stage');
      } catch (e) {
        if (!e.message.includes('invalid stage')) throw e;
      }

      // 8. Test: listActionable includes our test row (it's in 'researching')
      const actionable = await listActionable(100);
      const found = actionable.some(row => row.id === testIdeaId);
      if (!found) throw new Error('listActionable did not include the test row in researching stage');

      console.log('SELF-TEST PASS');
      // NOTE: no process.exit() here — it would skip the finally cleanup.
      // The process exits naturally (code 0) after cleanup completes.
    } finally {
      // Cleanup: delete the test row (cascade removes artifacts)
      if (testIdeaId) {
        try {
          await pub.from('blog_ideas').delete().eq('id', testIdeaId);
        } catch (e) {
          console.error('Warning: cleanup failed:', e.message);
        }
      }
    }
  })().catch(e => {
    console.error('SELF-TEST FAIL:', e.message);
    process.exit(1);
  });
}
