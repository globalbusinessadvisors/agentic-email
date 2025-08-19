import { IEmailProvider, FetchOptions } from '../core/interfaces';
import { Email } from '../models/email.model';
import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

export class GmailProvider implements IEmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  private imap: Imap | null = null;
  private logger: winston.Logger;

  constructor(
    private config: {
      user: string;
      pass: string;
      host?: string;
      port?: number;
      secure?: boolean;
    }
  ) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'gmail-provider' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  async connect(): Promise<void> {
    this.transporter = nodemailer.createTransport({
      host: this.config.host || 'smtp.gmail.com',
      port: this.config.port || 587,
      secure: this.config.secure !== undefined ? this.config.secure : false,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });

    this.imap = new Imap({
      user: this.config.user,
      password: this.config.pass,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    await new Promise<void>((resolve, reject) => {
      this.imap!.once('ready', () => {
        this.logger.info('IMAP connection established');
        resolve();
      });

      this.imap!.once('error', (err: Error) => {
        this.logger.error('IMAP connection error', err);
        reject(err);
      });

      this.imap!.connect();
    });
  }

  async disconnect(): Promise<void> {
    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
    this.transporter = null;
    this.logger.info('Disconnected from Gmail');
  }

  async sendEmail(email: Partial<Email>): Promise<string> {
    if (!this.transporter) {
      throw new Error('Not connected to email service');
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `${email.from?.name || ''} <${email.from?.email || this.config.user}>`,
      to: email.to?.map(r => `${r.name || ''} <${r.email}>`).join(', '),
      cc: email.cc?.map(r => `${r.name || ''} <${r.email}>`).join(', '),
      bcc: email.bcc?.map(r => `${r.name || ''} <${r.email}>`).join(', '),
      subject: email.subject,
      text: email.body,
      html: email.htmlBody,
      attachments: email.attachments?.map(a => ({
        filename: a.filename,
        content: a.data || '',
        contentType: a.contentType,
      })),
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.info(`Email sent: ${info.messageId}`);
    
    return info.messageId;
  }

  async fetchEmails(options?: FetchOptions): Promise<Email[]> {
    if (!this.imap) {
      throw new Error('Not connected to IMAP service');
    }

    const emails: Email[] = [];
    const folder = options?.folder || 'INBOX';

    await new Promise<void>((resolve, reject) => {
      this.imap!.openBox(folder, false, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const searchCriteria = options?.unreadOnly ? ['UNSEEN'] : ['ALL'];
    
    if (options?.since) {
      searchCriteria.push(['SINCE', options.since.toISOString()] as any);
    }

    const results = await new Promise<number[]>((resolve, reject) => {
      this.imap!.search(searchCriteria, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    const fetchLimit = options?.limit || 50;
    const fetchResults = results.slice(-fetchLimit);

    if (fetchResults.length === 0) {
      return emails;
    }

    const fetch = this.imap.fetch(fetchResults, {
      bodies: '',
      struct: true,
      markSeen: false,
    });

    await new Promise<void>((resolve, reject) => {
      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          simpleParser(stream, async (err: any, parsed: any) => {
            if (err) {
              this.logger.error('Error parsing email', err);
              return;
            }

            const email: Email = {
              id: uuidv4(),
              messageId: parsed.messageId || uuidv4(),
              threadId: parsed.inReplyTo || undefined,
              from: {
                email: parsed.from?.value[0]?.address || '',
                name: parsed.from?.value[0]?.name,
              },
              to: (parsed.to?.value || []).map((addr: any) => ({
                email: addr.address || '',
                name: addr.name,
              })),
              cc: (parsed.cc?.value || []).map((addr: any) => ({
                email: addr.address || '',
                name: addr.name,
              })),
              bcc: (parsed.bcc?.value || []).map((addr: any) => ({
                email: addr.address || '',
                name: addr.name,
              })),
              subject: parsed.subject || '',
              body: parsed.text || '',
              htmlBody: parsed.html || undefined,
              snippet: (parsed.text || '').substring(0, 200),
              date: parsed.date || new Date(),
              priority: 'normal',
              category: 'primary',
              labels: ['inbox'],
              attachments: (parsed.attachments || []).map((att: any) => ({
                id: uuidv4(),
                filename: att.filename || 'attachment',
                contentType: att.contentType || 'application/octet-stream',
                size: att.size || 0,
                data: att.content?.toString('base64'),
              })),
              isRead: false,
              isStarred: false,
              isDraft: false,
            };

            emails.push(email);
          });
        });
      });

      fetch.once('error', (err) => {
        this.logger.error('Fetch error', err);
        reject(err);
      });

      fetch.once('end', () => {
        resolve();
      });
    });

    this.logger.info(`Fetched ${emails.length} emails`);
    return emails;
  }

  async markAsRead(messageId: string): Promise<void> {
    if (!this.imap) {
      throw new Error('Not connected to IMAP service');
    }

    await new Promise<void>((resolve, reject) => {
      this.imap!.search([['HEADER', 'Message-ID', messageId]], (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        if (results.length === 0) {
          resolve();
          return;
        }

        this.imap!.addFlags(results[0], '\\Seen', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async moveToFolder(messageId: string, folder: string): Promise<void> {
    if (!this.imap) {
      throw new Error('Not connected to IMAP service');
    }

    await new Promise<void>((resolve, reject) => {
      this.imap!.search([['HEADER', 'Message-ID', messageId]], (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        if (results.length === 0) {
          resolve();
          return;
        }

        this.imap!.move(results[0], folder, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async deleteEmail(messageId: string): Promise<void> {
    await this.moveToFolder(messageId, 'Trash');
  }
}