PROJECT: OpsRadar — AI Operations Audit Tool for Agencies

WHAT THIS IS:
A Next.js web app where agency owners answer questions about their business 
operations, and AI generates a detailed automation audit showing what to 
automate, estimated time savings, and implementation blueprints.

TECH STACK:
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS for styling
- Supabase for database and auth
- OpenAI API (GPT-4o) for audit generation
- Stripe for payments (Phase 2 — skip for MVP)

PROJECT STRUCTURE:
/app
  /page.tsx              — Landing page
  /audit/page.tsx        — Audit questionnaire (multi-step form)
  /results/[id]/page.tsx — Results page (shows audit results)
  /api/generate-audit/route.ts — API endpoint that calls OpenAI
  /api/save-audit/route.ts     — API endpoint that saves to Supabase
/components
  /ui/                   — Reusable UI components (buttons, cards, inputs)
  /audit/                — Audit-specific components (question steps, progress bar)
  /results/              — Results display components (opportunity cards, ROI calculator)
/lib
  /supabase.ts           — Supabase client setup
  /openai.ts             — OpenAI client setup
  /prompts.ts            — AI prompt templates for audit generation
  /types.ts              — TypeScript types for the whole app

DESIGN DIRECTION:
- Dark theme with electric blue (#0066FF) and cyan (#00D4FF) accents
- Clean, professional, slightly futuristic — this is an intelligence tool, not a toy
- Font: Use "Instrument Sans" for headings, "Inter" fallback for body (or similar clean pairing)
- Generous whitespace, smooth animations on page transitions
- Mobile responsive from the start

DATABASE SCHEMA (Supabase):
Table: audits
  - id (uuid, primary key)
  - created_at (timestamp)
  - email (text)
  - company_name (text)
  - team_size (text)
  - industry (text — marketing_agency, recruiting_agency, design_agency, other)
  - tools_used (text array — list of tools they use)
  - services_offered (text)
  - biggest_time_wasters (text)
  - manual_processes (text)
  - monthly_revenue_range (text)
  - audit_results_summary (jsonb — the free tier results)
  - audit_results_full (jsonb — the paid tier results)
  - is_paid (boolean, default false)
  - stripe_payment_id (text, nullable)

THE AUDIT QUESTIONNAIRE (8 Questions, Multi-Step Form):

Step 1: "What type of agency are you?"
  → Options: Marketing Agency, Recruiting/Staffing, Design/Creative Agency, 
     Development Agency, PR/Communications, Other (specify)

Step 2: "How large is your team?"
  → Options: Just me, 2-5 people, 6-15 people, 16-30 people, 31-50 people, 50+

Step 3: "What tools does your team use daily?" (multi-select)
  → Options: HubSpot, Salesforce, GoHighLevel, Slack, Google Workspace, 
     Asana, Monday, Trello, Notion, Airtable, Mailchimp, ActiveCampaign,
     Stripe, QuickBooks, Calendly, Zoom, Custom CRM, Other

Step 4: "What services does your agency offer?"
  → Free text, 2-3 sentences

Step 5: "What are the top 3 tasks your team spends the most time on that 
         feel repetitive or manual?"
  → Free text

Step 6: "Which of these processes are still manual in your agency?" (multi-select)
  → Options: Lead capture & qualification, Client onboarding, Reporting & analytics,
     Invoice generation, Social media scheduling, Email follow-ups, 
     Project handoffs between teams, Client communication, Data entry between tools,
     Proposal/contract creation

Step 7: "What's your approximate monthly revenue?"
  → Options: Under $10K, $10K-$25K, $25K-$50K, $50K-$100K, $100K-$250K, $250K+

Step 8: "Where do things fall through the cracks most often?"
  → Free text

AI PROMPT FOR GENERATING THE AUDIT:
(This goes in /lib/prompts.ts)

System prompt for the AI:
"You are an operations intelligence analyst specializing in agency automation. 
You analyze agency operations data and produce detailed automation audits.

You must respond in valid JSON format with this exact structure:
{
  "summary": {
    "total_hours_saved_weekly": number,
    "total_annual_cost_savings": number,
    "automation_readiness_score": number (1-100),
    "headline": "string — one compelling sentence about their biggest opportunity"
  },
  "opportunities": [
    {
      "rank": number,
      "title": "string — name of the automation opportunity",
      "problem": "string — describe the pain in their language",
      "solution": "string — what the automated system does",
      "hours_saved_weekly": number,
      "annual_savings": number,
      "difficulty": "easy | medium | complex",
      "tools_involved": ["list of tools this connects"],
      "implementation_steps": [
        "Step 1...",
        "Step 2...",
        "Step 3..."
      ],
      "workflow_description": "string — detailed technical description of the n8n workflow architecture",
      "quick_win": boolean
    }
  ],
  "priority_roadmap": {
    "week_1": "string — what to automate first",
    "month_1": "string — what to build in month 1",  
    "month_3": "string — the full automation ecosystem"
  },
  "tools_analysis": {
    "current_stack_rating": number (1-10),
    "missing_integrations": ["tools they should add"],
    "redundant_tools": ["tools they could eliminate"]
  }
}

Be specific. Use real numbers based on industry benchmarks. Reference their 
actual tools by name. Each opportunity must be genuinely actionable — not generic 
advice. Think like a $300/hr operations consultant giving their most valuable 
analysis for free."

User prompt template:
"Analyze this agency's operations and generate a comprehensive automation audit:

Agency Type: {industry}
Team Size: {team_size}
Tools Used: {tools_used}
Services Offered: {services_offered}
Top Time-Wasting Tasks: {biggest_time_wasters}
Manual Processes: {manual_processes}
Monthly Revenue: {monthly_revenue_range}
Where Things Fall Through Cracks: {pain_points}

Generate the audit in the specified JSON format. Be specific to THIS agency's 
exact situation. Reference their actual tools. Calculate realistic savings 
based on their team size and industry."

FREE VS PAID RESULTS:
- Free: Show summary (headline, total hours saved, readiness score) + 
  first opportunity title and problem only (blurred/locked details)
- Paid: Show everything — all opportunities with full details, roadmap, 
  tools analysis, implementation steps

IMPORTANT BUILD NOTES:
- Build mobile-first, ensure it works perfectly on phone
- Add smooth transitions between form steps (slide animation)
- Results page should feel like receiving a professional consulting report
- Add a progress bar on the questionnaire
- Include social proof section on landing page (can be "Join 100+ agencies" 
  even before launch — update with real numbers later)
- Every results page must have "Want this built for you? Book a free call" CTA
- Add email capture before showing ANY results (even free tier)
- Loading state while AI generates should show animated progress 
  ("Analyzing your tech stack..." → "Identifying automation opportunities..." 
  → "Calculating ROI..." → "Generating your blueprint...")