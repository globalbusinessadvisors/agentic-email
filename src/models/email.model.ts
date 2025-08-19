import { z } from 'zod';

export const EmailPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export const EmailCategorySchema = z.enum([
  'primary',
  'social',
  'promotions',
  'updates',
  'forums',
  'spam',
  'important',
  'starred',
  'sent',
  'draft',
  'trash',
]);

export const EmailAttachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  data: z.string().optional(),
  url: z.string().url().optional(),
});

export const EmailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
});

export const EmailSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string(),
  threadId: z.string().optional(),
  from: EmailAddressSchema,
  to: z.array(EmailAddressSchema),
  cc: z.array(EmailAddressSchema).optional(),
  bcc: z.array(EmailAddressSchema).optional(),
  subject: z.string(),
  body: z.string(),
  htmlBody: z.string().optional(),
  snippet: z.string().optional(),
  date: z.date(),
  priority: EmailPrioritySchema,
  category: EmailCategorySchema,
  labels: z.array(z.string()),
  attachments: z.array(EmailAttachmentSchema),
  isRead: z.boolean(),
  isStarred: z.boolean(),
  isDraft: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
  aiAnalysis: z.object({
    sentiment: z.number().min(-1).max(1).optional(),
    summary: z.string().optional(),
    actionItems: z.array(z.string()).optional(),
    entities: z.array(z.object({
      text: z.string(),
      type: z.string(),
      salience: z.number(),
    })).optional(),
    suggestedReply: z.string().optional(),
    urgencyScore: z.number().min(0).max(10).optional(),
  }).optional(),
});

export type Email = z.infer<typeof EmailSchema>;
export type EmailPriority = z.infer<typeof EmailPrioritySchema>;
export type EmailCategory = z.infer<typeof EmailCategorySchema>;
export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;
export type EmailAddress = z.infer<typeof EmailAddressSchema>;