#!/usr/bin/env node
// voice-intake.mjs — watched-folder voice-memo intake for the Convert pipeline.
// New audio in ~/projects/MetaArchitect/intake/voice-memos/ → transcribe with
// local whisper.cpp (installed + small model on first run) → POST a queued
// conversion (source_type session_notes) → move the file to processed/.
// Scheduled every 15 min via Command Center (kind: script).
//
// Sterling memory rule: transcription NEVER runs alongside a next build — if
// one is running, this fire defers (files just wait for the next fire).
// --dry-run transcribes nothing and lists what would be processed.

import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename, extname } from "node:path";

const HOME = homedir();
const INTAKE = join(HOME, "projects/MetaArchitect/intake/voice-memos");
const PROCESSED = join(INTAKE, "processed");
const WHISPER_DIR = join(HOME, "projects/whisper.cpp");
const WHISPER_BIN = join(WHISPER_DIR, "build/bin/whisper-cli");
const MODEL = join(WHISPER_DIR, "models/ggml-small.bin");
const API = "http://100.105.85.5:3737/api/conversions";
const AUDIO_EXT = new Set([".m4a", ".mp3", ".wav", ".ogg", ".opus", ".aac", ".flac", ".webm"]);
const MAX_PER_FIRE = 3;
const dryRun = process.argv.includes("--dry-run");

mkdirSync(PROCESSED, { recursive: true });

// Memory guard: never transcribe while a next build runs (Sterling ~8GB headroom).
// Bracket trick so the pgrep's own shell never matches the pattern.
try {
  execSync("pgrep -f '[n]ext build'", { stdio: "pipe" });
  console.log("voice-intake: next build running — deferring to the next fire");
  process.exit(0);
} catch { /* no build running — proceed */ }

const files = readdirSync(INTAKE)
  .filter((f) => AUDIO_EXT.has(extname(f).toLowerCase()))
  .map((f) => join(INTAKE, f))
  .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
  .slice(0, MAX_PER_FIRE);

if (files.length === 0) {
  console.log("voice-intake: no new memos");
  process.exit(0);
}
if (dryRun) {
  console.log(`[dry-run] would process:\n${files.join("\n")}`);
  process.exit(0);
}

function ensureWhisper() {
  if (existsSync(WHISPER_BIN) && existsSync(MODEL)) return;
  console.log("voice-intake: first run — installing whisper.cpp (this takes a few minutes)");
  const env = { ...process.env, PATH: `${join(HOME, ".local/bin")}:${process.env.PATH}` };
  if (!existsSync(WHISPER_DIR)) {
    execFileSync("git", ["clone", "--depth", "1", "https://github.com/ggml-org/whisper.cpp.git", WHISPER_DIR], { stdio: "inherit" });
  }
  if (!existsSync(WHISPER_BIN)) {
    execSync(`cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j4 --config Release`, {
      cwd: WHISPER_DIR, stdio: "inherit", env,
    });
  }
  if (!existsSync(MODEL)) {
    execSync("bash models/download-ggml-model.sh small", { cwd: WHISPER_DIR, stdio: "inherit" });
  }
}
ensureWhisper();

let ok = 0;
for (const file of files) {
  const name = basename(file);
  try {
    const wav = join(PROCESSED, `.tmp-${Date.now()}.wav`);
    execFileSync("ffmpeg", ["-y", "-i", file, "-ar", "16000", "-ac", "1", wav], { stdio: "pipe" });
    const out = wav.replace(/\.wav$/, "");
    execFileSync(WHISPER_BIN, ["-m", MODEL, "-f", wav, "-otxt", "-of", out, "--no-prints"], { stdio: "pipe" });
    const text = readFileSync(`${out}.txt`, "utf8").trim();
    rmSync(wav, { force: true });
    rmSync(`${out}.txt`, { force: true });
    if (!text) throw new Error("empty transcription");

    const day = new Date(statSync(file).mtimeMs).toISOString().slice(0, 10);
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: `Voice memo — ${name} (${day})`,
        source_type: "session_notes",
        raw_content: text,
        targets: ["linkedin", "x"],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status !== 201) throw new Error(`conversion POST ${res.status}: ${(await res.text()).slice(0, 200)}`);
    renameSync(file, join(PROCESSED, name));
    ok++;
    console.log(`voice-intake: queued "${name}" (${text.length} chars) and moved to processed/`);
  } catch (err) {
    // File stays in the intake folder; the next fire retries it.
    console.error(`voice-intake: FAILED on ${name}: ${err.message}`);
  }
}
console.log(`voice-intake: ${ok}/${files.length} memo(s) queued`);
