import { EmailServer } from './api/server';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'agentic-email' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

async function main(): Promise<void> {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const server = new EmailServer(port);
    
    await server.start();
    
    logger.info('Agentic Email System started successfully');
    logger.info(`API available at http://localhost:${port}`);
    logger.info(`WebSocket available at ws://localhost:${port}`);

    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

export * from './models/email.model';
export { AgentType, AgentConfig, AgentTask, AgentTypeSchema, AgentConfigSchema, AgentTaskSchema, AgentStatusSchema } from './models/agent.model';
export { IEmailService, IEmailProvider, IAgent, IAgentOrchestrator, IDatabase, EmailSearchQuery, EmailThread, FetchOptions, AgentProcessResult, AgentAction, ProcessingResult } from './core/interfaces';
export * from './services/email.service';
export * from './services/agent-orchestrator.service';
export * from './services/database.service';
export * from './agents/base.agent';
export * from './agents/categorizer.agent';
export * from './agents/prioritizer.agent';
export * from './agents/summarizer.agent';
export * from './providers/gmail.provider';
export * from './api/server';