export interface EmailCampaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  type: CampaignType;
  targetAudience: AudienceSegment;
  schedule: CampaignSchedule;
  content: CampaignContent;
  deliveryConfig: DeliveryConfig;
  metrics: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  approvalStatus?: ApprovalStatus;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignType = 'one-time' | 'recurring' | 'drip' | 'triggered' | 'ab-test';

export interface AudienceSegment {
  id: string;
  name: string;
  criteria: SegmentCriteria[];
  estimatedSize: number;
  tags: string[];
  dynamicFields?: Record<string, any>;
}

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  conjunction?: 'AND' | 'OR';
}

export interface CampaignSchedule {
  startDate: Date;
  endDate?: Date;
  timezone: string;
  sendTime?: string; // HH:MM format
  frequency?: ScheduleFrequency;
  batchSize?: number;
  throttleRate?: number; // emails per minute
}

export interface ScheduleFrequency {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  customCron?: string;
}

export interface CampaignContent {
  subject: string;
  preheader?: string;
  body: string;
  htmlBody?: string;
  templates: EmailTemplate[];
  personalization: PersonalizationConfig;
  attachments?: Attachment[];
  linkedinData?: LinkedInContent;
  newsData?: NewsContent;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: TemplateVariable[];
  performance?: TemplatePerformance;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'list';
  defaultValue?: any;
  required: boolean;
  validation?: string;
}

export interface PersonalizationConfig {
  enabled: boolean;
  fields: PersonalizationField[];
  dynamicContent: DynamicContentRule[];
  aiOptimization: boolean;
}

export interface PersonalizationField {
  placeholder: string;
  source: 'contact' | 'linkedin' | 'news' | 'custom';
  field: string;
  fallback?: string;
}

export interface DynamicContentRule {
  id: string;
  condition: string;
  content: string;
  priority: number;
}

export interface LinkedInContent {
  enabled: boolean;
  sources: LinkedInSource[];
  extractionRules: DataExtractionRule[];
  updateFrequency: string;
}

export interface LinkedInSource {
  type: 'profile' | 'company' | 'post' | 'article';
  url?: string;
  searchQuery?: string;
  filters?: Record<string, any>;
}

export interface NewsContent {
  enabled: boolean;
  sources: NewsSource[];
  topics: string[];
  relevanceThreshold: number;
  summaryLength: number;
}

export interface NewsSource {
  name: string;
  url: string;
  rssUrl?: string;
  apiKey?: string;
  category: string;
  trustScore: number;
}

export interface DataExtractionRule {
  field: string;
  selector?: string;
  pattern?: string;
  transform?: string;
}

export interface DeliveryConfig {
  provider: EmailProvider;
  smtp?: SMTPConfig;
  cloudRelay?: CloudRelayConfig;
  postfixConfig?: PostfixConfig;
  retryPolicy: RetryPolicy;
  bounceHandling: BounceConfig;
  unsubscribeHandling: UnsubscribeConfig;
}

export type EmailProvider = 'smtp' | 'sendgrid' | 'aws-ses' | 'mailgun' | 'postfix' | 'mautic' | 'mailtrain' | 'listmonk' | 'sympa';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  poolSize?: number;
  rateLimit?: number;
}

export interface CloudRelayConfig {
  apiKey: string;
  endpoint?: string;
  region?: string;
  sandbox?: boolean;
}

export interface PostfixConfig {
  serverHost: string;
  queueDirectory: string;
  maxQueueSize: number;
  deliveryRateLimit: number;
  bounceAddress: string;
  dkimConfig?: DKIMConfig;
  spfConfig?: SPFConfig;
}

export interface DKIMConfig {
  enabled: boolean;
  selector: string;
  privateKey: string;
  domain: string;
}

export interface SPFConfig {
  enabled: boolean;
  record: string;
  strictMode: boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface BounceConfig {
  enabled: boolean;
  categorization: boolean;
  autoRemove: boolean;
  notificationEmail?: string;
  webhookUrl?: string;
}

export interface UnsubscribeConfig {
  enabled: boolean;
  headerMethod: boolean;
  linkMethod: boolean;
  listUnsubscribePost?: boolean;
  confirmationPage?: string;
}

export interface CampaignMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  converted: number;
  revenue?: number;
  engagementScore: number;
  deliverabilityScore: number;
  contentScore: number;
  timing: TimingMetrics;
  geographic: GeographicMetrics;
  devices: DeviceMetrics;
}

export interface TimingMetrics {
  avgTimeToOpen: number;
  avgTimeToClick: number;
  bestSendTime: string;
  peakEngagementHour: number;
}

export interface GeographicMetrics {
  byCountry: Record<string, number>;
  byRegion: Record<string, number>;
  byCity: Record<string, number>;
}

export interface DeviceMetrics {
  desktop: number;
  mobile: number;
  tablet: number;
  webmail: number;
  byClient: Record<string, number>;
}

export interface ApprovalStatus {
  required: boolean;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
  conditions?: string[];
}

export interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  size: number;
  encoding?: string;
}

export interface TemplatePerformance {
  uses: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  score: number;
}

export interface EmailDraft {
  id: string;
  campaignId?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent';
  recipient: RecipientProfile;
  content: DraftContent;
  aiGenerated: boolean;
  aiScore?: number;
  personalizations: Record<string, any>;
  scheduledAt?: Date;
  sentAt?: Date;
  metrics?: DraftMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipientProfile {
  email: string;
  name?: string;
  company?: string;
  title?: string;
  linkedinUrl?: string;
  customFields: Record<string, any>;
  preferences: RecipientPreferences;
  engagementHistory: EngagementEvent[];
}

export interface RecipientPreferences {
  language: string;
  timezone: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  topics: string[];
  unsubscribedTopics: string[];
}

export interface EngagementEvent {
  type: 'sent' | 'opened' | 'clicked' | 'replied' | 'forwarded' | 'unsubscribed';
  timestamp: Date;
  campaignId?: string;
  emailId?: string;
  metadata?: Record<string, any>;
}

export interface DraftContent {
  subject: string;
  body: string;
  htmlBody?: string;
  preheader?: string;
  cta?: CallToAction[];
  linkedinInsights?: string;
  newsHighlights?: string;
}

export interface CallToAction {
  text: string;
  url: string;
  style?: Record<string, string>;
  tracking: boolean;
}

export interface DraftMetrics {
  predictedOpenRate: number;
  predictedClickRate: number;
  sentimentScore: number;
  readabilityScore: number;
  spamScore: number;
  personalizationScore: number;
}

export interface ICampaignService {
  createCampaign(campaign: Partial<EmailCampaign>): Promise<EmailCampaign>;
  updateCampaign(id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign>;
  getCampaign(id: string): Promise<EmailCampaign | null>;
  listCampaigns(filter?: CampaignFilter): Promise<EmailCampaign[]>;
  deleteCampaign(id: string): Promise<boolean>;
  
  scheduleCampaign(id: string, schedule: CampaignSchedule): Promise<void>;
  pauseCampaign(id: string): Promise<void>;
  resumeCampaign(id: string): Promise<void>;
  
  createDraft(draft: Partial<EmailDraft>): Promise<EmailDraft>;
  approveDraft(draftId: string, approver: string): Promise<void>;
  rejectDraft(draftId: string, reason: string): Promise<void>;
  
  generateDrafts(campaignId: string, count: number): Promise<EmailDraft[]>;
  optimizeDraft(draftId: string): Promise<EmailDraft>;
  
  getMetrics(campaignId: string): Promise<CampaignMetrics>;
  exportCampaign(id: string, format: 'json' | 'csv' | 'pdf'): Promise<Buffer>;
}

export interface CampaignFilter {
  status?: CampaignStatus[];
  type?: CampaignType[];
  createdBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'updated' | 'name' | 'performance';
  sortOrder?: 'asc' | 'desc';
}