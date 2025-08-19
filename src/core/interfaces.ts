import { Email, EmailAddress, EmailPriority, EmailCategory } from '../models/email.model';
import { AgentConfig, AgentTask } from '../models/agent.model';

export interface IEmailService {
  send(email: Partial<Email>): Promise<Email>;
  receive(): Promise<Email[]>;
  getById(id: string): Promise<Email | null>;
  update(id: string, updates: Partial<Email>): Promise<Email>;
  delete(id: string): Promise<boolean>;
  search(query: EmailSearchQuery): Promise<Email[]>;
  getThreads(): Promise<EmailThread[]>;
}

export interface IEmailProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendEmail(email: Partial<Email>): Promise<string>;
  fetchEmails(options?: FetchOptions): Promise<Email[]>;
  markAsRead(messageId: string): Promise<void>;
  moveToFolder(messageId: string, folder: string): Promise<void>;
  deleteEmail(messageId: string): Promise<void>;
}

export interface IAgent {
  id: string;
  name: string;
  type: string;
  process(email: Email): Promise<AgentProcessResult>;
  initialize(config: AgentConfig): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): AgentStatus;
}

export interface IAgentOrchestrator {
  registerAgent(agent: IAgent): void;
  unregisterAgent(agentId: string): void;
  processEmail(email: Email): Promise<ProcessingResult>;
  getAgents(): IAgent[];
  getAgentStatus(agentId: string): AgentStatus | null;
}

export interface IDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  saveEmail(email: Email): Promise<void>;
  getEmail(id: string): Promise<Email | null>;
  updateEmail(id: string, updates: Partial<Email>): Promise<void>;
  deleteEmail(id: string): Promise<void>;
  searchEmails(query: EmailSearchQuery): Promise<Email[]>;
  saveAgentTask(task: AgentTask): Promise<void>;
  getAgentTasks(agentId: string): Promise<AgentTask[]>;
}

export interface EmailSearchQuery {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  category?: EmailCategory;
  priority?: EmailPriority;
  dateFrom?: Date;
  dateTo?: Date;
  isRead?: boolean;
  isStarred?: boolean;
  labels?: string[];
  limit?: number;
  offset?: number;
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: EmailAddress[];
  emails: Email[];
  lastMessageDate: Date;
  unreadCount: number;
  totalCount: number;
}

export interface FetchOptions {
  folder?: string;
  limit?: number;
  since?: Date;
  unreadOnly?: boolean;
}

export interface AgentProcessResult {
  success: boolean;
  modifications?: Partial<Email>;
  actions?: AgentAction[];
  error?: string;
}

export interface AgentAction {
  type: string;
  parameters: Record<string, unknown>;
}

export interface ProcessingResult {
  email: Email;
  agentResults: Map<string, AgentProcessResult>;
  finalEmail: Email;
  processingTime: number;
}

export interface AgentStatus {
  isActive: boolean;
  currentTask?: string;
  lastError?: string;
  metrics: {
    processedCount: number;
    errorCount: number;
    averageTime: number;
  };
}