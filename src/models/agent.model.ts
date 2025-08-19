import { z } from 'zod';

export const AgentTypeSchema = z.enum([
  'categorizer',
  'prioritizer',
  'summarizer',
  'responder',
  'scheduler',
  'filter',
  'translator',
  'security',
]);

export const AgentStatusSchema = z.enum(['idle', 'processing', 'error', 'disabled']);

export const AgentConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: AgentTypeSchema,
  status: AgentStatusSchema,
  enabled: z.boolean(),
  priority: z.number().min(0).max(100),
  config: z.record(z.unknown()),
  capabilities: z.array(z.string()),
  lastRun: z.date().optional(),
  metrics: z.object({
    processedEmails: z.number(),
    averageProcessingTime: z.number(),
    errorRate: z.number(),
    successRate: z.number(),
  }).optional(),
});

export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  emailId: z.string().uuid(),
  action: z.string(),
  parameters: z.record(z.unknown()),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  result: z.unknown().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export type AgentType = z.infer<typeof AgentTypeSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentTask = z.infer<typeof AgentTaskSchema>;