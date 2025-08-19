import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { EmailService } from '../services/email.service';
import { AgentOrchestrator } from '../services/agent-orchestrator.service';
import { DatabaseService } from '../services/database.service';
import { GmailProvider } from '../providers/gmail.provider';
import { CategorizerAgent } from '../agents/categorizer.agent';
import { PrioritizerAgent } from '../agents/prioritizer.agent';
import { SummarizerAgent } from '../agents/summarizer.agent';
import { Email } from '../models/email.model';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

export class EmailServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private emailService!: EmailService;
  private orchestrator!: AgentOrchestrator;
  private database: DatabaseService;
  private logger: winston.Logger;

  constructor(private port: number = 3000) {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'email-server' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });

    this.database = new DatabaseService(process.env.DB_PATH || './emails.db');
    this.setupServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private async setupServices(): Promise<void> {
    await this.database.connect();

    const emailProvider = new GmailProvider({
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    });

    this.emailService = new EmailService(emailProvider, this.database);
    this.orchestrator = new AgentOrchestrator(this.database, process.env.REDIS_URL);

    const categorizerConfig = {
      id: uuidv4(),
      name: 'Categorizer',
      type: 'categorizer',
      status: 'idle',
      enabled: true,
      priority: 80,
      config: {},
      capabilities: ['categorize'],
    };
    const categorizerAgent = new CategorizerAgent(categorizerConfig);

    const prioritizerConfig = {
      id: uuidv4(),
      name: 'Prioritizer',
      type: 'prioritizer',
      status: 'idle',
      enabled: true,
      priority: 70,
      config: {},
      capabilities: ['prioritize'],
    };
    const prioritizerAgent = new PriorizerAgent(prioritizerConfig);

    const summarizerConfig = {
      id: uuidv4(),
      name: 'Summarizer',
      type: 'summarizer',
      status: 'idle',
      enabled: true,
      priority: 60,
      config: {},
      capabilities: ['summarize'],
    };
    const summarizerAgent = new SummarizerAgent(summarizerConfig);

    await categorizerAgent.initialize(categorizerConfig);
    await prioritizerAgent.initialize(prioritizerConfig);
    await summarizerAgent.initialize(summarizerConfig);

    this.orchestrator.registerAgent(categorizerAgent);
    this.orchestrator.registerAgent(prioritizerAgent);
    this.orchestrator.registerAgent(summarizerAgent);

    this.logger.info('Services initialized');
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date() });
    });

    this.app.post('/api/emails/send', async (req, res) => {
      try {
        const email = await this.emailService.send(req.body);
        const result = await this.orchestrator.processEmail(email);
        res.json(result.finalEmail);
      } catch (error) {
        this.logger.error('Failed to send email', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to send email' 
        });
      }
    });

    this.app.get('/api/emails/receive', async (req, res) => {
      try {
        const emails = await this.emailService.receive();
        const processedEmails = [];

        for (const email of emails) {
          const result = await this.orchestrator.processEmail(email);
          processedEmails.push(result.finalEmail);
        }

        res.json(processedEmails);
      } catch (error) {
        this.logger.error('Failed to receive emails', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to receive emails' 
        });
      }
    });

    this.app.get('/api/emails/:id', async (req, res) => {
      try {
        const email = await this.emailService.getById(req.params.id);
        if (!email) {
          res.status(404).json({ error: 'Email not found' });
        } else {
          res.json(email);
        }
      } catch (error) {
        this.logger.error('Failed to get email', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to get email' 
        });
      }
    });

    this.app.put('/api/emails/:id', async (req, res) => {
      try {
        const email = await this.emailService.update(req.params.id, req.body);
        res.json(email);
      } catch (error) {
        this.logger.error('Failed to update email', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to update email' 
        });
      }
    });

    this.app.delete('/api/emails/:id', async (req, res) => {
      try {
        const success = await this.emailService.delete(req.params.id);
        res.json({ success });
      } catch (error) {
        this.logger.error('Failed to delete email', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to delete email' 
        });
      }
    });

    this.app.post('/api/emails/search', async (req, res) => {
      try {
        const emails = await this.emailService.search(req.body);
        res.json(emails);
      } catch (error) {
        this.logger.error('Failed to search emails', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to search emails' 
        });
      }
    });

    this.app.get('/api/emails/threads', async (req, res) => {
      try {
        const threads = await this.emailService.getThreads();
        res.json(threads);
      } catch (error) {
        this.logger.error('Failed to get threads', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to get threads' 
        });
      }
    });

    this.app.get('/api/agents', (_req, res) => {
      const agents = this.orchestrator.getAgents();
      res.json(agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.getStatus(),
      })));
    });

    this.app.get('/api/agents/:id/status', (req, res) => {
      const status = this.orchestrator.getAgentStatus(req.params.id);
      if (!status) {
        res.status(404).json({ error: 'Agent not found' });
      } else {
        res.json(status);
      }
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      this.logger.info(`Client connected: ${socket.id}`);

      socket.on('subscribe', (room: string) => {
        socket.join(room);
        this.logger.info(`Client ${socket.id} joined room: ${room}`);
      });

      socket.on('unsubscribe', (room: string) => {
        socket.leave(room);
        this.logger.info(`Client ${socket.id} left room: ${room}`);
      });

      socket.on('process-email', async (email: Email) => {
        try {
          const result = await this.orchestrator.processEmail(email);
          socket.emit('email-processed', result);
          this.io.to('email-updates').emit('email-processed', result);
        } catch (error) {
          socket.emit('error', {
            message: error instanceof Error ? error.message : 'Processing failed',
          });
        }
      });

      socket.on('disconnect', () => {
        this.logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  async start(): Promise<void> {
    this.server.listen(this.port, () => {
      this.logger.info(`Email server running on port ${this.port}`);
    });
  }

  async stop(): Promise<void> {
    await this.orchestrator.shutdown();
    await this.database.disconnect();
    this.server.close();
    this.logger.info('Server stopped');
  }
}