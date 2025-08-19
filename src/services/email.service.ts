import { Email, EmailSchema } from '../models/email.model';
import { IEmailService, IEmailProvider, IDatabase, EmailSearchQuery, EmailThread } from '../core/interfaces';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

export class EmailService implements IEmailService {
  private logger: winston.Logger;

  constructor(
    private emailProvider: IEmailProvider,
    private database: IDatabase,
  ) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'email-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  async send(emailData: Partial<Email>): Promise<Email> {
    try {
      const email: Email = {
        id: uuidv4(),
        messageId: '',
        from: emailData.from!,
        to: emailData.to || [],
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        subject: emailData.subject || '',
        body: emailData.body || '',
        htmlBody: emailData.htmlBody,
        date: new Date(),
        priority: emailData.priority || 'normal',
        category: emailData.category || 'sent',
        labels: emailData.labels || ['sent'],
        attachments: emailData.attachments || [],
        isRead: true,
        isStarred: emailData.isStarred || false,
        isDraft: false,
        metadata: emailData.metadata || {},
      };

      const validatedEmail = EmailSchema.parse(email);
      const messageId = await this.emailProvider.sendEmail(validatedEmail);
      validatedEmail.messageId = messageId;

      await this.database.saveEmail(validatedEmail);
      this.logger.info(`Email sent successfully: ${messageId}`);

      return validatedEmail;
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async receive(): Promise<Email[]> {
    try {
      await this.emailProvider.connect();
      const emails = await this.emailProvider.fetchEmails();
      
      for (const email of emails) {
        await this.database.saveEmail(email);
      }

      await this.emailProvider.disconnect();
      this.logger.info(`Received ${emails.length} emails`);
      
      return emails;
    } catch (error) {
      this.logger.error('Failed to receive emails', error);
      throw new Error(`Failed to receive emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getById(id: string): Promise<Email | null> {
    try {
      return await this.database.getEmail(id);
    } catch (error) {
      this.logger.error(`Failed to get email ${id}`, error);
      throw new Error(`Failed to get email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: string, updates: Partial<Email>): Promise<Email> {
    try {
      await this.database.updateEmail(id, updates);
      const updatedEmail = await this.database.getEmail(id);
      
      if (!updatedEmail) {
        throw new Error(`Email ${id} not found`);
      }

      if (updates.isRead !== undefined) {
        await this.emailProvider.markAsRead(updatedEmail.messageId);
      }

      this.logger.info(`Email ${id} updated successfully`);
      return updatedEmail;
    } catch (error) {
      this.logger.error(`Failed to update email ${id}`, error);
      throw new Error(`Failed to update email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const email = await this.database.getEmail(id);
      if (!email) {
        return false;
      }

      await this.emailProvider.deleteEmail(email.messageId);
      await this.database.deleteEmail(id);
      
      this.logger.info(`Email ${id} deleted successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete email ${id}`, error);
      throw new Error(`Failed to delete email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(query: EmailSearchQuery): Promise<Email[]> {
    try {
      const results = await this.database.searchEmails(query);
      this.logger.info(`Search returned ${results.length} emails`);
      return results;
    } catch (error) {
      this.logger.error('Failed to search emails', error);
      throw new Error(`Failed to search emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getThreads(): Promise<EmailThread[]> {
    try {
      const allEmails = await this.database.searchEmails({});
      const threadMap = new Map<string, EmailThread>();

      for (const email of allEmails) {
        const threadId = email.threadId || email.id;
        
        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, {
            id: threadId,
            subject: email.subject,
            participants: [],
            emails: [],
            lastMessageDate: email.date,
            unreadCount: 0,
            totalCount: 0,
          });
        }

        const thread = threadMap.get(threadId)!;
        thread.emails.push(email);
        thread.totalCount++;
        
        if (!email.isRead) {
          thread.unreadCount++;
        }

        if (email.date > thread.lastMessageDate) {
          thread.lastMessageDate = email.date;
        }

        const addParticipant = (addr: typeof email.from) => {
          if (!thread.participants.some(p => p.email === addr.email)) {
            thread.participants.push(addr);
          }
        };

        addParticipant(email.from);
        email.to.forEach(addParticipant);
        email.cc?.forEach(addParticipant);
      }

      const threads = Array.from(threadMap.values());
      threads.sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());

      this.logger.info(`Retrieved ${threads.length} email threads`);
      return threads;
    } catch (error) {
      this.logger.error('Failed to get email threads', error);
      throw new Error(`Failed to get threads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}