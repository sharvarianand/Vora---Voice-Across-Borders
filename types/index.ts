// ── Automation / Knowledge Base types ─────────────────────────────────────

export interface KnowledgeBaseItem {
  id: string;
  type: "faq" | "text";
  /** FAQ only */
  question?: string;
  answer?: string;
  /** Plain-text block only */
  content?: string;
  /** Human-readable label shown in the UI */
  label?: string;
}

export interface AutomationContext {
  items: KnowledgeBaseItem[];
}

export interface AutoReplyNodeData {
  tone_prompt: string;
  use_product_context: boolean;
  use_campaign_context: boolean;
  [key: string]: unknown;
}

// ──────────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sheet_id: string | null;
  drive_folder_id: string | null;
  gmail_label_prefix: string | null;
  /** Campaign-agnostic knowledge base inherited by all campaigns. */
  knowledge_base: AutomationContext;
  created_at: string;
}

export interface EnrichedLeadData {
  job_title?: string | null;
  bio?: string | null;
  company_description?: string | null;
  recent_news?: string | null;
  interests?: string[];
  pain_points?: string[];
  personalization_hooks: string[];
  sources_used: string[];
  scraped_at: string;
}

export interface CandidateLead {
  name: string;
  email: string;
  company: string | null;
  industry: string | null;
  job_title: string | null;
  source_url: string | null;
}

export interface Lead {
  id: string;
  product_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  industry: string | null;
  tags: string[];
  enriched_data: EnrichedLeadData | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  product_id: string;
  name: string;
  workflow_json: WorkflowJSON;
  status: "draft" | "active" | "completed";
  gmail_label_id: string | null;
  /** Max outbound emails per hour for this campaign. null = unlimited. */
  email_rate_limit_per_hour: number | null;
  /** Campaign-scoped knowledge base for the Auto Reply node. */
  automation_context: AutomationContext;
  created_at: string;
  product?: Product;
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string;
  current_node_id: string;
  status: "queued" | "waiting" | "active" | "completed" | "failed";
  followup_count: number;
  last_action_time: string | null;
  next_action_time: string;
  replied: boolean;
  thread_id: string | null;
  last_message_id: string | null;
  thread_subject: string | null;
  whatsapp_jid: string | null;
  whatsapp_last_msg_ts: number | null;
  created_at: string;
  lead?: Lead;
  campaign?: Campaign;
}

export interface Log {
  id: string;
  campaign_lead_id: string;
  action: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ThreadMessage {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  isOutbound: boolean;
}

export interface WorkflowJSON {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowNode {
  id: string;
  type:
    | "start"
    | "send_email"
    | "sendEmail"
    | "wait"
    | "condition"
    | "checkReply"
    | "sendFollowup"
    | "auto_reply"
    | "send_whatsapp"
    | "end";
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  condition?: string;
}

export interface WhatsAppNodeData {
  prompt: string;
  mode: "personalized" | "same_for_all";
  cached_body?: string;
  [key: string]: unknown;
}

export interface SendEmailNodeData {
  prompt: string;
  mode: "personalized" | "same_for_all";
  cached_subject?: string;
  cached_body?: string;
  [key: string]: unknown;
}

export interface WaitNodeData {
  duration: number;
  unit: "seconds" | "minutes" | "hours" | "days";
  [key: string]: unknown;
}

export interface ConditionNodeData {
  check: "replied" | "not_replied";
  [key: string]: unknown;
}

// ── Compliance types ────────────────────────────────────────────────────────

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: string;
  created_at: string;
}

export interface UnsubscribeRecord {
  id: string;
  campaign_lead_id: string;
  email: string;
  token: string;
  created_at: string;
}

// ── Deliverability types ────────────────────────────────────────────────────

export interface WarmupSchedule {
  id: string;
  campaign_id: string;
  day_number: number;
  daily_limit: number;
  phase: "warmup" | "rampup" | "full";
  started_at: string;
  updated_at: string;
}

export interface DeliverabilityEvent {
  id: string;
  campaign_lead_id: string;
  event_type: "sent" | "bounced_hard" | "bounced_soft" | "complaint";
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Analytics Dashboard types ───────────────────────────────────────────────

export interface PipelineStage {
  stage: string;
  count: number;
  color: string;
}

export interface DailyVolume {
  date: string;
  sent: number;
  replies: number;
}

export interface FollowupEffectiveness {
  step: number;
  label: string;
  sent: number;
  replies: number;
  replyRate: number;
}

export interface ActivityEvent {
  id: string;
  action: string;
  status: string;
  leadName: string;
  leadEmail: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface LeadPerformance {
  id: string;
  campaignLeadId: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  replied: boolean;
  followupCount: number;
  lastActionTime: string | null;
}

export interface CampaignHealthScore {
  overall: number;
  factors: {
    replyRate: { score: number; max: number; detail: string };
    bounceRate: { score: number; max: number; detail: string };
    completionRate: { score: number; max: number; detail: string };
    unsubRate: { score: number; max: number; detail: string };
    velocity: { score: number; max: number; detail: string };
  };
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface EnrichedAnalytics {
  /** Basic counters */
  totalLeads: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  emailsAttempted: number;
  replies: number;
  replyRate: number;
  completed: number;
  failed: number;
  inProgress: number;
  totalFollowups: number;
  /** Pipeline funnel */
  pipeline: PipelineStage[];
  /** Daily send volume (last 30 days) */
  dailyVolume: DailyVolume[];
  /** Follow-up effectiveness by step */
  followupEffectiveness: FollowupEffectiveness[];
  /** Recent activity feed */
  recentActivity: ActivityEvent[];
  /** Lead-level performance */
  leadPerformance: LeadPerformance[];
  /** Campaign health score */
  healthScore: CampaignHealthScore;
}

export interface ComplianceAudit {
  suppressionCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  totalEmailsSent: number;
  unsubscribeRate: number;
  recentUnsubscribes: Array<{
    id: string;
    email: string;
    created_at: string;
    campaign_lead_id: string;
  }>;
}

export interface DeliverabilityDashboard {
  sent: number;
  hardBounces: number;
  softBounces: number;
  complaints: number;
  bounceRate: number;
  warmupPhase: string | null;
  currentDailyLimit: number | null;
}

export interface WarmupDashboard {
  enabled: boolean;
  schedule: WarmupSchedule | null;
  projection: Array<{ day: number; limit: number; phase: string }>;
}
