# Rosey — Hackathon Slide Prompts (Nano Banana Pro)

> 7 prompts for Nano Banana Pro image generation. Each prompt produces one slide.

---

## Slide 1 — Title & Hook

```
Generate a professional hackathon presentation slide with a dark navy-to-deep-purple gradient background and subtle glowing mesh network lines in the background. At the top center, display the name "ROSEY" in large bold white sans-serif lettering with a soft pink-gold glow behind it. Below it, smaller text in white reads: "AI-Powered Omnichannel Outreach Automation". Below that, a thin horizontal golden line separator, then the tagline in light italic text: "From Cold Lead to Closed Deal — Fully Automated". At the bottom-left corner, small text: "Built with Next.js 16 · Supabase · GPT-5.3 · Gmail API · WhatsApp Web". At the bottom-right, a small badge-style element reading "Hackathon 2026". The overall aesthetic is sleek, modern SaaS product launch. No images, only text and abstract background geometry.
```

---

## Slide 2 — The Problem

```
Generate a presentation slide with a clean dark background (near-black #0F1117). The title at the top in bold white text reads: "The Problem". Below, display exactly 4 rows, each a horizontal card-style block with rounded corners, light dark-gray fill (#1A1D27), and a colored icon on the left. The 4 rows are:

Row 1: Red warning icon (triangle). Text: "Manual Outreach Doesn't Scale" — subtitle in gray: "Sales reps spend 65% of their time on non-selling activities"
Row 2: Orange clock icon. Text: "Follow-ups Fall Through the Cracks" — subtitle: "80% of deals need 5+ touchpoints, most reps stop at 2"
Row 3: Yellow envelope icon. Text: "Personalization vs. Volume Tradeoff" — subtitle: "Generic blasts get <1% reply rate. Personalized emails take 15 min each"
Row 4: Purple chain-broken icon. Text: "No Unified Multi-Channel View" — subtitle: "Email, WhatsApp, CRM — reps juggle 6+ tools with zero coordination"

At the bottom, a single-line callout box with a blue-gradient background and white text: "Rosey solves all four. Autonomously."
```

---

## Slide 3 — Product Overview (What Rosey Does)

```
Generate a presentation slide with a dark background. Title at top: "What Rosey Does" in bold white. Below the title, arrange a horizontal 3-column layout. Each column is a rounded card with a subtle border glow.

Column 1 — Header icon: a brain with circuit lines (AI icon). Title in cyan: "AI Email & WhatsApp Outreach". Bullet points in white small text:
• "GPT-5.3 generates hyper-personalized emails"
• "Supports Gmail + WhatsApp Web natively"
• "Dynamic {{name}}, {{company}}, {{industry}} merge tags"
• "CAN-SPAM compliant with auto unsubscribe links"

Column 2 — Header icon: a flowchart/workflow diagram icon. Title in magenta-pink: "Visual Drag-and-Drop Workflows". Bullet points:
• "React Flow canvas — zero code required"
• "Nodes: Start → Send Email → Wait → Check Reply → Branch → End"
• "WhatsApp nodes for multi-channel sequences"
• "Pre-built templates: Simple, Aggressive, Nurture"

Column 3 — Header icon: a radar/dashboard gauge icon. Title in amber/gold: "Real-Time Intelligence". Bullet points:
• "Live reply detection via Gmail + WhatsApp"
• "AI lead enrichment (Exa.ai + Jina Reader)"
• "Deliverability monitoring & bounce classification"
• "Inbox view with AI-assisted reply composer"

Below all three columns, a thin footer line then text: "Fully open-source · Self-hostable · Dockerized" in gray.
```

---

## Slide 4 — Architecture Diagram

```
Generate a highly detailed software architecture diagram on a dark (#0D1117) background, styled as a clean engineering diagram with color-coded sections.

Title at the top in bold white: "System Architecture"

Draw these components as labeled rounded rectangles, connected by directional arrows with labels:

TOP ROW (User Layer) — light blue boxes:
  [Browser Client] — label: "Next.js 16 App Router + React Flow Canvas + Zustand State"

MIDDLE ROW (Application Layer) — arranged horizontally, green boxes:
  [API Routes] — label: "REST API (Next.js Route Handlers)"
  [Workflow Engine] — label: "Generic Interpreter (lib/workflow-engine.ts)"
  [Campaign Engine] — label: "Execution Orchestrator (lib/engine.ts)"

BOTTOM-LEFT (Data Layer) — purple boxes:
  [Supabase Postgres] — label: "Products, Leads, Campaigns, CampaignLeads, Logs, Suppression, Deliverability Events"

BOTTOM-RIGHT (External Services) — orange boxes, arranged vertically:
  [Gmail API] — label: "OAuth2 · Send · Label · Reply Detection"
  [WhatsApp Web] — label: "Baileys WebSocket · QR Auth · Send · Reply Check"
  [Azure OpenAI] — label: "GPT-5.3 · JSON Mode · Email + WA Generation"
  [Exa.ai + Jina] — label: "Lead Enrichment · LinkedIn · Company Scraping"
  [Tavily API] — label: "AI Lead Finder · Web Search"

SEPARATE BOX bottom-center — red/coral box:
  [Background Worker] — label: "Polling Loop (10s) · POST /api/engine/run · Warm-up Scheduler"

ARROWS (draw as labeled arrows between boxes):
  Browser Client → API Routes (labeled "fetch / REST")
  API Routes → Supabase Postgres (labeled "Supabase Client (SSR)")
  API Routes → Campaign Engine (labeled "Trigger processActiveCampaigns()")
  Campaign Engine → Workflow Engine (labeled "runWorkflow()")
  Campaign Engine → Gmail API (labeled "sendEmail() / hasReply()")
  Campaign Engine → WhatsApp Web (labeled "sendWhatsAppMessage()")
  Campaign Engine → Azure OpenAI (labeled "generateMessage()")
  Campaign Engine → Supabase Postgres (labeled "Service Role Key (bypass RLS)")
  Background Worker → API Routes (labeled "Bearer Token Auth · 10s interval")
  API Routes → Exa.ai + Jina (labeled "enrichLead()")
  API Routes → Tavily API (labeled "findLeads()")
  Campaign Engine → Supabase Postgres (two-way arrow, labeled "Claim Lead → Update State")

Use a clean legend in the bottom-right corner with colored squares: Blue = Frontend, Green = App Logic, Purple = Database, Orange = External APIs, Red = Worker Process. All text must be sharp and readable. Use thin white arrows with small labels. The diagram should look like a real engineering architecture diagram.
```

---

## Slide 5 — Workflow Engine Deep Dive

```
Generate a presentation slide with a dark background. Title: "The Workflow Engine — How It Works" in bold white.

The slide has two halves, left and right:

LEFT HALF — A visual flowchart showing an actual campaign workflow:
Draw connected rounded-rectangle nodes with colored headers and directional arrows between them:

  Node 1 (green header): "▶ START" — subtitle: "Entry point"
    ↓ (arrow)
  Node 2 (blue header): "✉ SEND EMAIL" — subtitle: "AI-generated intro • Gmail API"
    ↓
  Node 3 (yellow header): "⏳ WAIT 3 DAYS" — subtitle: "Engine parks lead, sets next_action_time"
    ↓
  Node 4 (purple header): "🔀 CHECK REPLY" — subtitle: "hasThreadReceivedReply()"
    ↓ YES (green arrow going right)  |  ↓ NO (red arrow going down)
  YES branch → Node 5a (teal header): "✉ SEND THANK YOU" → Node 6 (red header): "⏹ END"
  NO branch → Node 5b (blue header): "💬 SEND WHATSAPP" — subtitle: "Baileys WA Web"
    ↓
  Node 7 (yellow header): "⏳ WAIT 2 DAYS"
    ↓
  Node 8 (blue header): "✉ SEND FOLLOW-UP #2"
    ↓
  Node 9 (red header): "⏹ END"

RIGHT HALF — A vertical list titled "Engine Execution Loop" with numbered steps in small cards:
  Step 1: "Fetch active campaigns"
  Step 2: "Query due campaign_leads (status: queued/waiting, next_action_time ≤ now)"
  Step 3: "Atomic claim: SET status = 'active' WHERE still queued/waiting"
  Step 4: "runWorkflow() from current_node_id with campaign handlers"
  Step 5: "Handler returns: advance | delayMs | branch | stop"
  Step 6: "Update DB: waiting → next_action_time OR completed"
  Step 7: "Worker polls again in 10 seconds"

Below both halves, a callout bar in gradient cyan-blue: "Zero race conditions. Atomic claiming prevents double-processing. Supports unlimited concurrent leads."
```

---

## Slide 6 — Key Differentiators

```
Generate a presentation slide with a dark background. Title at top: "Why Rosey Wins" in bold white.

Display a 2x3 grid of feature cards (2 columns, 3 rows). Each card has a dark background with a subtle colored left-border accent and an icon:

Card 1 (left-border: cyan, icon: shield with lock):
Title: "CAN-SPAM Compliant by Default"
Body: "HMAC-signed unsubscribe tokens · Global suppression list · Auto-injected compliance footer with physical address · One-click opt-out"

Card 2 (left-border: green, icon: chart going up):
Title: "Smart Email Warm-up"
Body: "Geometric ramp: 10 → 500 emails/day over 21 days · 3 phases (warmup → rampup → full) · Auto-advances daily · Prevents domain blacklisting"

Card 3 (left-border: orange, icon: two chat bubbles):
Title: "True Omnichannel: Email + WhatsApp"
Body: "Gmail OAuth2 + Baileys WhatsApp Web in one workflow · Reply detection on both channels · Condition nodes branch on channel-specific replies"

Card 4 (left-border: magenta, icon: sparkles/magic wand):
Title: "AI-Powered Lead Discovery"
Body: "Tavily web search → GPT-5.3 extraction → Structured leads with name, company, job title, source URL · Context-aware: uses product description to find relevant prospects"

Card 5 (left-border: purple, icon: magnifying glass + person):
Title: "Deep Lead Enrichment"
Body: "Exa.ai neural search for LinkedIn · Jina Reader for company websites · GPT synthesis into: bio, pain points, interests, personalization hooks · Stored as queryable JSONB"

Card 6 (left-border: amber, icon: bar chart with pulse line):
Title: "Deliverability Intelligence"
Body: "Hard/soft bounce classification · Complaint tracking · Real-time bounce rate · Warm-up phase indicator · Projected ramp schedule visualization"

No other elements. Clean, professional SaaS comparison-style layout.
```

---

## Slide 7 — Tech Stack & Call to Action

```
Generate a final presentation slide with a dramatic dark-to-deep-blue gradient background with faint constellation-style dots connected by thin lines.

At the top, bold white title: "Built With Best-in-Class Tech"

In the center, display a horizontal row of 8 technology "pill" badges, each with the technology logo/icon on the left and name on the right. The pills have dark semi-transparent backgrounds with subtle glowing borders matching each tech's brand color:

Pill 1: Next.js 16 logo + "Next.js 16" (white border)
Pill 2: TypeScript logo + "TypeScript 5" (blue border #3178C6)
Pill 3: Supabase logo + "Supabase Postgres" (green border #3ECF8E)
Pill 4: Tailwind CSS logo + "Tailwind v4" (cyan border #06B6D4)
Pill 5: OpenAI logo + "GPT-5.3" (purple border)
Pill 6: Gmail logo + "Gmail API" (red border)
Pill 7: WhatsApp logo + "WhatsApp Web" (green border #25D366)
Pill 8: React Flow logo + "React Flow v12" (pink border)

Below the pill row, a centered block of text:
Line 1 in large bold gradient text (cyan to pink): "Fully Open Source · Self-Hostable · Dockerized"
Line 2 in medium white text: "From zero to sending AI-personalized outreach in under 5 minutes"

At the very bottom center, a large rounded-rectangle CTA button with a vibrant gradient (blue to purple) fill and white bold text: "★ Star us on GitHub". Beside it, slightly smaller text in light gray: "Let's build the future of outreach together."

Bottom-right corner: "Rosey — Hackathon 2026" in small gray text.
```

---

## Usage Notes

1. **Copy each prompt** (the text inside the code blocks) directly into Nano Banana Pro.
2. Each prompt is self-contained — generates exactly one slide.
3. Slide 4 (Architecture) is the most complex — if needed, increase resolution/size settings.
4. The prompts reference real code paths, real function names, and real architecture decisions from the codebase for authenticity.
5. Recommended aspect ratio: **16:9** (1920x1080 or 3840x2160 for 4K).
