import { spawnSync } from 'node:child_process';

export class StageError extends Error {}

/** Shell out to the claude CLI (Max subscription — house rule: never the SDK). */
export function callClaude(prompt, { timeoutMs = 300_000 } = {}) {
  const cmd = process.env.ANALYZER_CLAUDE_CMD ?? 'claude';
  const res = spawnSync(cmd, ['-p', '--output-format', 'json'], {
    input: prompt, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error) throw new StageError(`claude spawn failed: ${res.error.message}`);
  if (res.status !== 0) throw new StageError(`claude exited ${res.status}: ${(res.stderr || '').slice(0, 300)}`);
  let out;
  try { out = JSON.parse(res.stdout); } catch { throw new StageError('claude CLI did not return a JSON envelope'); }
  if (typeof out.result !== 'string') throw new StageError('claude CLI envelope missing result');
  return { text: out.result, model: Object.keys(out.modelUsage ?? {})[0] ?? 'unknown' };
}

export function parseJsonBlock(text) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in LLM output');
  return JSON.parse(stripped.slice(start, end + 1));
}

/**
 * E — Explicit: one LLM call behind a validation gate. Invalid output → one
 * retry carrying the validator's complaint; still invalid → StageError.
 * Never a silent continue. Every attempt is logged (T).
 */
export async function validatedLLMCall({ prompt, validate, stepName, log }) {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const p = attempt === 1 ? prompt
      : `${prompt}\n\nYour previous output was rejected by a validation gate: ${lastErr}\nReturn ONLY the corrected JSON object.`;
    let model = 'unknown';
    try {
      const res = callClaude(p);
      model = res.model;
      const parsed = parseJsonBlock(res.text);
      validate(parsed); // throws with a reason
      await log({ step_name: stepName, model_version: model, status: 'success', output_summary: `attempt ${attempt}: valid` });
      return parsed;
    } catch (err) {
      lastErr = err.message;
      await log({ step_name: stepName, model_version: model, status: 'error', output_summary: `attempt ${attempt}: ${lastErr}`.slice(0, 500) });
    }
  }
  throw new StageError(`${stepName}: invalid LLM output after retry — ${lastErr}`);
}
