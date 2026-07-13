# SOTA blog pipeline — design requirements brief (NotebookLM deep research, 2026-07-13)

status: queued
goal_id: none
picked_up_by: nobody yet
updated: 2026-07-13

> Reference brief, not a standalone workstream — it is consumed by 2026-07-13-blog-masterpiece-handoff.md and its status tracks that handoff.
> Notebook: 69695efc-7994-40de-a513-3bc491152d1f (81 sources). Query it via mcp__notebooklm-mcp__notebook_query for follow-ups; citation numbers refer to notebook sources.
> Companion to 2026-07-13-blog-masterpiece-handoff.md.

This design requirements brief outlines the state-of-the-art specifications for an AI-driven content pipeline tailored for a technical brand like **simonparis.ca** (AI reliability engineering) in the 2026 landscape.

### 1. Pipeline Architecture: Multi-Agent Orchestration
The most effective 2026 workflows have shifted from single-prompt generation to **Agentic Content Operations**, where specialized AI roles collaborate autonomously within defined guardrails [1, 2].

*   **Framework:** Use a graph-based state machine like **LangGraph** for production-grade control or **CrewAI** for role-based multi-agent collaboration [3-5].
*   **Core Agent Roles:**
    *   **Research Agent:** Synthesizes information from technical knowledge bases and web retrieval, assigning relevance scores and citing primary sources [6, 7].
    *   **Outliner Agent:** Structures narrative flow based on "Information Gain"—ensuring the content adds unique value not found in existing top SERP results [8, 9].
    *   **Writer Agent:** Drafts prose using grounded "Brand DNA" (voice samples and technical constraints) to avoid generic outputs [6, 10].
    *   **SEO/AEO Optimizer:** Integrates semantic pathways, internal linking structures, and structured data [6, 11].
    *   **Fact-Checker:** Validates every statistic and claim against the original source to eliminate hallucinations [6, 12].
*   **Validation Gates & HITL Checkpoints:**
    *   **Confidence-Gated Routing:** Auto-approve high-confidence sections; flag borderline or low-confidence outputs (hallucination risk) for human intervention [13].
    *   **Findings Review:** A mandatory human checkpoint before conclusions or technical recommendations are acted on [14].
    *   **The "One-Third" Rule:** Humans must add a real point of view or original data. If the human-added element is under 33%, the piece is flagged for revision to avoid being filtered as "low-effort" [12, 15].
*   **Success Metrics:** Measure **Cost per Task** (target: €1–4 per saved labor hour), **Hallucination Rate** (target: <2%), and **Share of Model (SoM)** [16, 17].

### 2. SEO 2026: The "Experience" Foundation
Traditional SEO is now the "Authority Layer" for AI visibility. Google does not penalize AI content by default, but it aggressively filters **"scaled content abuse"** (mass-produced, unedited unoriginal filler) [18-20].

*   **E-E-A-T Criticality:**
    *   **Experience:** This is the primary differentiator against "AI slop." Use original photos, behind-the-scenes engineering logs, and first-person accounts of reliability tests [21, 22].
    *   **Trust:** Now considered your SEO infrastructure. Google's core updates (March 2024–March 2026) consistently reward sites with verifiable author credentials and prominent transparency signals [23-25].
*   **Internal Linking (Link Reasoning Architecture):**
    *   **Authority Spine:** Use pillar pages to cover broad reliability topics, linked bi-directionally to 8–12 cluster pages [26, 27].
    *   **Link Density:** Aim for 2–5 contextual internal links per 1,000 words using descriptive, varied anchor text (15-25% exact match, 30-40% partial match) [27, 28].

### 3. AEO: Winning Answer Engines
Answer Engine Optimization (AEO) ensures content is extractable by synthesis engines [29].

*   **Answer-First Structure (BLUF):** Start every major heading (H2) with a direct, **40–60 word answer block** before diving into technical depth [30-32].
*   **Question-Led Headings:** Frame H2s and H3s as literal questions users ask (e.g., "What are the common failure modes in agentic RAG?") rather than abstract titles [33, 34].
*   **FAQ Evolution:** On May 7, 2026, Google officially dropped **FAQ rich results** for all sites [35, 36]. However, **FAQPage schema remains a "GEO cheat code"**; LLMs use it to find snippet-ready facts. Optimize FAQ answers to be **80–150 words** for higher citation probability in ChatGPT and Perplexity [37, 38].

### 4. GEO: Citation Engineering
Generative Engine Optimization (GEO) focuses on getting the brand recommended by name and cited as a source [39, 40].

*   **The Princeton Findings:** Research confirms that adding **Citations** (+40%), **Statistics** (+37%), and **Expert Quotations** (+30%) are the most effective ways to boost AI visibility [41-43].
*   **Freshness Bias:** AI-cited content is **25.7% fresher** on average than organic results [44, 45]. Implement a 3–6 month review cycle for all high-intent technical pages [46, 47].
*   **llms.txt Strategy:** Deploy a `/llms.txt` file at the root. While not a Google ranking factor, it is essential **Business-to-Agent (B2A) infrastructure** that helps AI coding tools and sales-research agents navigate your site efficiently [48-50].
*   **Citation Tracking:** Monitor **Citation Rate** (percentage of brand appearances in relevant prompts) and **Share of Model** (your mentions vs. competitors) monthly [17, 51].

### 5. Schema: Machine-Readable Trust
Schema markup is the API between your site and AI agents [52].

*   **Priority 1: Article/BlogPosting.** Include `author` and `dateModified` properties [53].
*   **Priority 2: Person (Author).** Use `sameAs` links pointing to external identifiers like LinkedIn, Wikipedia, or GRID to disambiguate the author as a verified entity in the Knowledge Graph [54, 55].
*   **Priority 3: Organization.** Implement sitewide with a clear `logo`, `contactPoint`, and `knowsAbout` (list specific AI reliability domains here) [56, 57].
*   **Priority 4: BreadcrumbList.** Essential for showing AI systems the hierarchical context of your technical documentation [58].

### 6. Transparency: Disclosure Expectations
*   **Google Search:** Disclosing AI use is not a ranking factor but is recommended for content where users would reasonably expect to know how it was created [59, 60].
*   **Ads Policy:** As of July 9, 2026, Google requires all advertisers to **label AI-generated or altered content** in Search, YouTube, and Discover [61].
*   **Technical Verification:** Use **byline dates** and clear **"Last Reviewed"** labels with a link to an editorial policy that explains the human-in-the-loop process [62-64].