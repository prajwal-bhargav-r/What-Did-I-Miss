export type PriorityLevel = 'high' | 'medium' | 'low';

export type MessageCategory =
  | 'announcement'
  | 'deadline'
  | 'action_item'
  | 'decision'
  | 'question'
  | 'mention'
  | 'schedule_change'
  | 'general';

export type SummaryLength = 'very_short' | 'standard' | 'detailed';

export type TaskStatus = 'pending' | 'completed' | 'saved';

export type DateResolutionType = 'explicit' | 'relative_resolved' | 'ambiguous';

export type DeadlineCategory =
  | 'exam'
  | 'assignment'
  | 'project'
  | 'meeting'
  | 'registration'
  | 'schedule_change'
  | 'event';

export type FactConfidence = 'explicit' | 'inferred' | 'uncertain';

export interface ParsedMessage {
  id: string;
  index: number; // 1-based chronological order
  timestampRaw: string;
  timestampISO: string | null; // Parsed ISO date if available
  hasExplicitDate: boolean;
  hasExplicitTime: boolean;
  sender: string;
  content: string;
  isSystem: boolean;
  isMediaOmitted: boolean;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  isJokeOrHypothetical: boolean;
  priority: PriorityLevel;
  priorityScore: number;
  priorityReasons: string[];
  categories: MessageCategory[];
  threadContext: string | null;
  requiresResponse?: boolean;
  supersededByMessageId?: string | null;
  supersededByIndex?: number | null;
  supersedesMessageId?: string | null;
  supersedesIndex?: number | null;
  changeSummary?: string | null;
}

export interface ActionItem {
  id: string;
  conversationId: string;
  messageId: string;
  messageIndex: number;
  conciseTitle?: string;
  description: string;
  assignee: string;
  assigneeConfidence: 'explicit' | 'inferred_sender' | 'uncertain';
  deadline: string;
  deadlineConfidence: 'explicit' | 'relative_resolved' | 'ambiguous' | 'not_specified';
  priority: PriorityLevel;
  status: TaskStatus;
  sender: string;
  timestampRaw: string;
  originalContent: string;
  explanation: string;
}

export interface ExtractedDeadline {
  id: string;
  conversationId: string;
  messageId: string;
  messageIndex: number;
  title: string;
  category: DeadlineCategory;
  rawDateExpression: string;
  resolvedDateISO: string | null;
  displayDate: string;
  timeString: string | null;
  resolutionType: DateResolutionType;
  resolutionExplanation: string;
  previousScheduleNote?: string | null;
  candidateOptions?: string[]; // Provided when date is ambiguous so user can confirm
  userConfirmedDate: string | null;
  isConfirmed: boolean;
  priority: PriorityLevel;
  sender: string;
  timestampRaw: string;
  originalContent: string;
}

export interface PersonalMention {
  id: string;
  conversationId: string;
  messageId: string;
  messageIndex: number;
  type:
    | 'direct_mention'
    | 'assigned_task'
    | 'direct_question'
    | 'reply_to_user'
    | 'followed_topic'
    | 'requires_response';
  matchedTerm: string;
  reason: string;
  requiresResponse?: boolean;
  priority: PriorityLevel;
  sender: string;
  timestampRaw: string;
  content: string;
}

export interface TopicCluster {
  id: string;
  topic: string;
  messageCount: number;
  summary: string;
  participants: string[];
  keyMessageIds: string[];
}

export interface SummaryHighlight {
  id: string;
  text: string;
  conciseHeadline?: string;
  changeSummary?: string | null;
  confidence?: FactConfidence;
  supersedesIndex?: number | null;
  supersededByIndex?: number | null;
  sender: string;
  timestampRaw: string;
  messageId: string;
  messageIndex: number;
  priority: PriorityLevel;
  reason: string;
}

export interface UnansweredQuestion {
  id: string;
  question: string;
  sender: string;
  timestampRaw: string;
  messageId: string;
  messageIndex: number;
  contextNote: string;
}

export interface ConversationSummary {
  overallBrief: string;
  veryShort: string[];
  standard: string[];
  detailed: string[];
  mainTopics: TopicCluster[];
  announcements: SummaryHighlight[];
  decisions: SummaryHighlight[];
  unansweredQuestions: UnansweredQuestion[];
  summaryEngineUsed?: string;
}

export interface GroqModelOption {
  id: string;
  label: string;
}

export interface GroqStatusResponse {
  configured: boolean;
  verified: boolean;
  latencyMs?: number;
  availableCount?: number;
  defaultModel: string;
  models: GroqModelOption[];
  message: string;
}

export interface QACitation {
  messageId: string;
  messageIndex: number;
  sender: string;
  timestampRaw: string;
  snippet: string;
}

export interface QATurn {
  id: string;
  question: string;
  answer: string;
  citations: QACitation[];
  confidence: 'grounded' | 'partial' | 'not_found';
  createdAt: string;
  engineUsed: string;
}

export interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  systemMessages: number;
  duplicateMessages: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  participants: { name: string; count: number }[];
  dateRange: { start: string | null; end: string | null };
  detectedFormat: string;
  processingTimeMs: number;
}

export interface ConversationRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sourceType: 'file' | 'paste' | 'sample';
  fileName?: string;
  rawText: string;
  messages: ParsedMessage[];
  stats: ConversationStats;
  summary: ConversationSummary;
  actionItems: ActionItem[];
  deadlines: ExtractedDeadline[];
  personalMentions: PersonalMention[];
  qaHistory: QATurn[];
}

export interface UserProfile {
  userName: string;
  aliases: string[];
  followedTopics: string[];
  persistLocally: boolean;
  useBrowserNativeAI: boolean;
  useGroqAI?: boolean;
  groqModel?: string;
}

export type ActiveNavSection =
  | 'dashboard'
  | 'conversations'
  | 'important'
  | 'actions'
  | 'deadlines'
  | 'mentions'
  | 'all_messages'
  | 'ask_ai'
  | 'privacy';
