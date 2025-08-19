import { EmailSchema, EmailPrioritySchema, EmailCategorySchema } from '../models/email.model';
import { v4 as uuidv4 } from 'uuid';

describe('Email Model', () => {
  describe('EmailSchema', () => {
    it('should validate a complete email object', () => {
      const validEmail = {
        id: uuidv4(),
        messageId: 'msg-123',
        from: { email: 'sender@example.com', name: 'Sender' },
        to: [{ email: 'recipient@example.com', name: 'Recipient' }],
        cc: [],
        bcc: [],
        subject: 'Test Email',
        body: 'This is a test email',
        htmlBody: '<p>This is a test email</p>',
        snippet: 'This is a test...',
        date: new Date(),
        priority: 'normal' as const,
        category: 'primary' as const,
        labels: ['inbox'],
        attachments: [],
        isRead: false,
        isStarred: false,
        isDraft: false,
        metadata: {},
        aiAnalysis: {
          sentiment: 0.5,
          summary: 'A test email',
          actionItems: [],
          entities: [],
          urgencyScore: 3,
        },
      };

      const result = EmailSchema.safeParse(validEmail);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      const invalidEmail = {
        id: uuidv4(),
        messageId: 'msg-123',
        from: { email: 'invalid-email' },
        to: [],
        subject: 'Test',
        body: 'Test',
        date: new Date(),
        priority: 'normal',
        category: 'primary',
        labels: [],
        attachments: [],
        isRead: false,
        isStarred: false,
        isDraft: false,
      };

      const result = EmailSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
    });

    it('should validate email priorities', () => {
      const priorities = ['low', 'normal', 'high', 'urgent'];
      priorities.forEach(priority => {
        const result = EmailPrioritySchema.safeParse(priority);
        expect(result.success).toBe(true);
      });

      const invalidPriority = EmailPrioritySchema.safeParse('invalid');
      expect(invalidPriority.success).toBe(false);
    });

    it('should validate email categories', () => {
      const categories = ['primary', 'social', 'promotions', 'updates', 'forums', 'spam'];
      categories.forEach(category => {
        const result = EmailCategorySchema.safeParse(category);
        expect(result.success).toBe(true);
      });

      const invalidCategory = EmailCategorySchema.safeParse('invalid');
      expect(invalidCategory.success).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const minimalEmail = {
        id: uuidv4(),
        messageId: 'msg-123',
        from: { email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        subject: 'Test',
        body: 'Test body',
        date: new Date(),
        priority: 'normal',
        category: 'primary',
        labels: [],
        attachments: [],
        isRead: false,
        isStarred: false,
        isDraft: false,
      };

      const result = EmailSchema.safeParse(minimalEmail);
      expect(result.success).toBe(true);
    });
  });
});