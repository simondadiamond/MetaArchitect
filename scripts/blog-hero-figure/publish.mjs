#!/usr/bin/env node
// Publish a finished hero figure: upload PNG (+ source SVG) to the public
// blog-assets bucket and set hero_image_url / hero_image_alt on the post.
// Usage: node scripts/blog-hero-figure/publish.mjs <slug> <figure.png> <figure.svg> "<alt text>"
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../.env") });

const [slug, pngPath, svgPath, alt] = process.argv.slice(2);
if (!slug || !pngPath || !svgPath || !alt) {
  console.error('usage: publish.mjs <slug> <figure.png> <figure.svg> "<alt text>"');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Refuse to publish for a slug that doesn't exist (typo guard).
const { data: post, error: postErr } = await supabase
  .from("blog_posts").select("id, slug").eq("slug", slug).single();
if (postErr || !post) {
  console.error(`no blog_posts row for slug "${slug}"`, postErr?.message ?? "");
  process.exit(1);
}

for (const [path, name, type] of [
  [pngPath, "hero.png", "image/png"],
  [svgPath, "hero.svg", "image/svg+xml"],
]) {
  const { error } = await supabase.storage
    .from("blog-assets")
    .upload(`${slug}/${name}`, readFileSync(path), { contentType: type, upsert: true });
  if (error) {
    console.error(`upload failed: ${name}`, error.message);
    process.exit(1);
  }
}

const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/blog-assets/${slug}/hero.png`;
const { error: updErr } = await supabase
  .from("blog_posts")
  .update({ hero_image_url: url, hero_image_alt: alt })
  .eq("id", post.id);
if (updErr) {
  console.error("column update failed:", updErr.message);
  process.exit(1);
}
console.log(`published: ${url}`);
