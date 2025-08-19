import { Email } from '../models/email.model';
import { AgentTask } from '../models/agent.model';
import { IDatabase, EmailSearchQuery } from '../core/interfaces';
import sqlite3 from 'sqlite3';
import winston from 'winston';

export class DatabaseService implements IDatabase {
  private db: sqlite3.Database | null = null;
  private logger: winston.Logger;

  constructor(private dbPath: string = ':memory:') {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'database' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          this.logger.error('Failed to connect to database', err);
          reject(err);
        } else {
          this.logger.info('Connected to database');
          await this.initializeTables();
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          this.logger.error('Failed to disconnect from database', err);
          reject(err);
        } else {
          this.logger.info('Disconnected from database');
          this.db = null;
          resolve();
        }
      });
    });
  }

  private async initializeTables(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const runAsync = (sql: string, params?: any[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        this.db!.run(sql, params || [], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    await runAsync(`
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        messageId TEXT UNIQUE,
        threadId TEXT,
        fromEmail TEXT,
        fromName TEXT,
        subject TEXT,
        body TEXT,
        htmlBody TEXT,
        snippet TEXT,
        date INTEGER,
        priority TEXT,
        category TEXT,
        isRead INTEGER,
        isStarred INTEGER,
        isDraft INTEGER,
        metadata TEXT,
        aiAnalysis TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS email_recipients (
        email_id TEXT,
        type TEXT,
        email TEXT,
        name TEXT,
        FOREIGN KEY (email_id) REFERENCES emails(id)
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS email_labels (
        email_id TEXT,
        label TEXT,
        FOREIGN KEY (email_id) REFERENCES emails(id)
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS email_attachments (
        id TEXT PRIMARY KEY,
        email_id TEXT,
        filename TEXT,
        contentType TEXT,
        size INTEGER,
        data TEXT,
        url TEXT,
        FOREIGN KEY (email_id) REFERENCES emails(id)
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id TEXT PRIMARY KEY,
        agentId TEXT,
        emailId TEXT,
        action TEXT,
        parameters TEXT,
        status TEXT,
        result TEXT,
        error TEXT,
        createdAt INTEGER,
        completedAt INTEGER
      )
    `);

    await runAsync('CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_emails_priority ON emails(priority)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_agent_tasks_agentId ON agent_tasks(agentId)');
  }

  async saveEmail(email: Email): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const runAsync = (sql: string, params?: any[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        this.db!.run(sql, params || [], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    await runAsync(
      `INSERT OR REPLACE INTO emails (
        id, messageId, threadId, fromEmail, fromName, subject, body, 
        htmlBody, snippet, date, priority, category, isRead, isStarred, 
        isDraft, metadata, aiAnalysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email.id,
        email.messageId,
        email.threadId || null,
        email.from.email,
        email.from.name || null,
        email.subject,
        email.body,
        email.htmlBody || null,
        email.snippet || null,
        email.date.getTime(),
        email.priority,
        email.category,
        email.isRead ? 1 : 0,
        email.isStarred ? 1 : 0,
        email.isDraft ? 1 : 0,
        JSON.stringify(email.metadata || {}),
        JSON.stringify(email.aiAnalysis || {}),
      ]
    );

    await runAsync('DELETE FROM email_recipients WHERE email_id = ?', [email.id]);
    
    for (const recipient of email.to) {
      await runAsync(
        'INSERT INTO email_recipients (email_id, type, email, name) VALUES (?, ?, ?, ?)',
        [email.id, 'to', recipient.email, recipient.name || null]
      );
    }

    if (email.cc) {
      for (const recipient of email.cc) {
        await runAsync(
          'INSERT INTO email_recipients (email_id, type, email, name) VALUES (?, ?, ?, ?)',
          [email.id, 'cc', recipient.email, recipient.name || null]
        );
      }
    }

    if (email.bcc) {
      for (const recipient of email.bcc) {
        await runAsync(
          'INSERT INTO email_recipients (email_id, type, email, name) VALUES (?, ?, ?, ?)',
          [email.id, 'bcc', recipient.email, recipient.name || null]
        );
      }
    }

    await runAsync('DELETE FROM email_labels WHERE email_id = ?', [email.id]);
    for (const label of email.labels) {
      await runAsync(
        'INSERT INTO email_labels (email_id, label) VALUES (?, ?)',
        [email.id, label]
      );
    }

    await runAsync('DELETE FROM email_attachments WHERE email_id = ?', [email.id]);
    for (const attachment of email.attachments) {
      await runAsync(
        `INSERT INTO email_attachments (
          id, email_id, filename, contentType, size, data, url
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          attachment.id,
          email.id,
          attachment.filename,
          attachment.contentType,
          attachment.size,
          attachment.data || null,
          attachment.url || null,
        ]
      );
    }
  }

  async getEmail(id: string): Promise<Email | null> {
    if (!this.db) throw new Error('Database not connected');

    const getAsync = (sql: string, params?: any[]): Promise<any> => {
      return new Promise((resolve, reject) => {
        this.db!.get(sql, params || [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };
    const allAsync = (sql: string, params?: any[]): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        this.db!.all(sql, params || [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    const row = await getAsync('SELECT * FROM emails WHERE id = ?', [id]);
    if (!row) return null;

    const recipients = await allAsync(
      'SELECT * FROM email_recipients WHERE email_id = ?',
      [id]
    );

    const labels = await allAsync(
      'SELECT label FROM email_labels WHERE email_id = ?',
      [id]
    );

    const attachments = await allAsync(
      'SELECT * FROM email_attachments WHERE email_id = ?',
      [id]
    );

    return this.rowToEmail(row as any, recipients as any[], labels as any[], attachments as any[]);
  }

  async updateEmail(id: string, updates: Partial<Email>): Promise<void> {
    const email = await this.getEmail(id);
    if (!email) throw new Error(`Email ${id} not found`);

    const updatedEmail = { ...email, ...updates };
    await this.saveEmail(updatedEmail);
  }

  async deleteEmail(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const runAsync = (sql: string, params?: any[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        this.db!.run(sql, params || [], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    await runAsync('DELETE FROM email_recipients WHERE email_id = ?', [id]);
    await runAsync('DELETE FROM email_labels WHERE email_id = ?', [id]);
    await runAsync('DELETE FROM email_attachments WHERE email_id = ?', [id]);
    await runAsync('DELETE FROM emails WHERE id = ?', [id]);
  }

  async searchEmails(query: EmailSearchQuery): Promise<Email[]> {
    if (!this.db) throw new Error('Database not connected');

    const allAsync = (sql: string, params?: any[]): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        this.db!.all(sql, params || [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    let sql = 'SELECT * FROM emails WHERE 1=1';
    const params: any[] = [];

    if (query.from) {
      sql += ' AND fromEmail LIKE ?';
      params.push(`%${query.from}%`);
    }

    if (query.subject) {
      sql += ' AND subject LIKE ?';
      params.push(`%${query.subject}%`);
    }

    if (query.body) {
      sql += ' AND body LIKE ?';
      params.push(`%${query.body}%`);
    }

    if (query.category) {
      sql += ' AND category = ?';
      params.push(query.category);
    }

    if (query.priority) {
      sql += ' AND priority = ?';
      params.push(query.priority);
    }

    if (query.dateFrom) {
      sql += ' AND date >= ?';
      params.push(query.dateFrom.getTime());
    }

    if (query.dateTo) {
      sql += ' AND date <= ?';
      params.push(query.dateTo.getTime());
    }

    if (query.isRead !== undefined) {
      sql += ' AND isRead = ?';
      params.push(query.isRead ? 1 : 0);
    }

    if (query.isStarred !== undefined) {
      sql += ' AND isStarred = ?';
      params.push(query.isStarred ? 1 : 0);
    }

    sql += ' ORDER BY date DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const rows = await allAsync(sql, params);
    const emails: Email[] = [];

    for (const row of rows as any[]) {
      const recipients = await allAsync(
        'SELECT * FROM email_recipients WHERE email_id = ?',
        [row.id]
      );

      const labels = await allAsync(
        'SELECT label FROM email_labels WHERE email_id = ?',
        [row.id]
      );

      const attachments = await allAsync(
        'SELECT * FROM email_attachments WHERE email_id = ?',
        [row.id]
      );

      const email = this.rowToEmail(row, recipients as any[], labels as any[], attachments as any[]);
      emails.push(email);
    }

    return emails;
  }

  async saveAgentTask(task: AgentTask): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const runAsync = (sql: string, params?: any[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        this.db!.run(sql, params || [], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    };

    await runAsync(
      `INSERT OR REPLACE INTO agent_tasks (
        id, agentId, emailId, action, parameters, status, result, error, createdAt, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.agentId,
        task.emailId,
        task.action,
        JSON.stringify(task.parameters),
        task.status,
        task.result ? JSON.stringify(task.result) : null,
        task.error || null,
        task.createdAt.getTime(),
        task.completedAt ? task.completedAt.getTime() : null,
      ]
    );
  }

  async getAgentTasks(agentId: string): Promise<AgentTask[]> {
    if (!this.db) throw new Error('Database not connected');

    const allAsync = (sql: string, params?: any[]): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        this.db!.all(sql, params || [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    const rows = await allAsync(
      'SELECT * FROM agent_tasks WHERE agentId = ? ORDER BY createdAt DESC',
      [agentId]
    );

    return (rows as any[]).map(row => ({
      id: row.id,
      agentId: row.agentId,
      emailId: row.emailId,
      action: row.action,
      parameters: JSON.parse(row.parameters),
      status: row.status,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      createdAt: new Date(row.createdAt),
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
    }));
  }

  private rowToEmail(
    row: any,
    recipients: any[],
    labels: any[],
    attachments: any[]
  ): Email {
    return {
      id: row.id,
      messageId: row.messageId,
      threadId: row.threadId || undefined,
      from: {
        email: row.fromEmail,
        name: row.fromName || undefined,
      },
      to: recipients.filter(r => r.type === 'to').map(r => ({
        email: r.email,
        name: r.name || undefined,
      })),
      cc: recipients.filter(r => r.type === 'cc').map(r => ({
        email: r.email,
        name: r.name || undefined,
      })) || undefined,
      bcc: recipients.filter(r => r.type === 'bcc').map(r => ({
        email: r.email,
        name: r.name || undefined,
      })) || undefined,
      subject: row.subject,
      body: row.body,
      htmlBody: row.htmlBody || undefined,
      snippet: row.snippet || undefined,
      date: new Date(row.date),
      priority: row.priority,
      category: row.category,
      labels: labels.map(l => l.label),
      attachments: attachments.map(a => ({
        id: a.id,
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        data: a.data || undefined,
        url: a.url || undefined,
      })),
      isRead: row.isRead === 1,
      isStarred: row.isStarred === 1,
      isDraft: row.isDraft === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      aiAnalysis: row.aiAnalysis ? JSON.parse(row.aiAnalysis) : undefined,
    };
  }
}