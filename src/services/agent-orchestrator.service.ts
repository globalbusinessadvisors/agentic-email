import { Email } from '../models/email.model';
import { AgentTask } from '../models/agent.model';
import { IAgent, IAgentOrchestrator, ProcessingResult, AgentStatus, IDatabase } from '../core/interfaces';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Bull from 'bull';

export class AgentOrchestrator implements IAgentOrchestrator {
  private agents: Map<string, IAgent> = new Map();
  private logger: winston.Logger;
  private processingQueue: Bull.Queue;
  private database: IDatabase;

  constructor(database: IDatabase, redisUrl?: string) {
    this.database = database;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'agent-orchestrator' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });

    this.processingQueue = new Bull('email-processing', redisUrl || 'redis://localhost:6379');
    this.setupQueueHandlers();
  }

  private setupQueueHandlers(): void {
    this.processingQueue.process(async (job) => {
      const { email } = job.data as { email: Email };
      return await this.processEmailInternal(email);
    });

    this.processingQueue.on('completed', (job, result) => {
      this.logger.info(`Processing completed for email ${job.data.email.id}`, result);
    });

    this.processingQueue.on('failed', (job, error) => {
      this.logger.error(`Processing failed for email ${job.data.email.id}`, error);
    });
  }

  registerAgent(agent: IAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} is already registered`);
    }

    this.agents.set(agent.id, agent);
    this.logger.info(`Agent ${agent.name} (${agent.id}) registered`);
  }

  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    this.agents.delete(agentId);
    this.logger.info(`Agent ${agent.name} (${agentId}) unregistered`);
  }

  async processEmail(email: Email): Promise<ProcessingResult> {
    const job = await this.processingQueue.add({ email });
    const result = await job.finished();
    return result as ProcessingResult;
  }

  private async processEmailInternal(email: Email): Promise<ProcessingResult> {
    const startTime = Date.now();
    const agentResults = new Map();
    let processedEmail = { ...email };

    const sortedAgents = Array.from(this.agents.values()).sort((a, b) => {
      const priorityA = this.getAgentPriority(a);
      const priorityB = this.getAgentPriority(b);
      return priorityB - priorityA;
    });

    for (const agent of sortedAgents) {
      try {
        const task: AgentTask = {
          id: uuidv4(),
          agentId: agent.id,
          emailId: email.id,
          action: 'process',
          parameters: { email: processedEmail },
          status: 'processing',
          createdAt: new Date(),
        };

        await this.database.saveAgentTask(task);

        const result = await agent.process(processedEmail);
        agentResults.set(agent.id, result);

        if (result.success && result.modifications) {
          processedEmail = { ...processedEmail, ...result.modifications };
        }

        task.status = result.success ? 'completed' : 'failed';
        task.result = result;
        task.completedAt = new Date();
        
        if (!result.success && result.error) {
          task.error = result.error;
        }

        await this.database.saveAgentTask(task);

        this.logger.info(`Agent ${agent.name} processed email ${email.id}`, {
          success: result.success,
          modifications: result.modifications,
        });
      } catch (error) {
        this.logger.error(`Agent ${agent.name} failed to process email ${email.id}`, error);
        agentResults.set(agent.id, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      email,
      agentResults,
      finalEmail: processedEmail,
      processingTime,
    };
  }

  getAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  getAgentStatus(agentId: string): AgentStatus | null {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    return agent.getStatus();
  }

  private getAgentPriority(agent: IAgent): number {
    const priorityMap: Record<string, number> = {
      security: 100,
      filter: 90,
      categorizer: 80,
      prioritizer: 70,
      summarizer: 60,
      translator: 50,
      responder: 40,
      scheduler: 30,
    };

    return priorityMap[agent.type] || 0;
  }

  async shutdown(): Promise<void> {
    await this.processingQueue.close();
    
    for (const agent of this.agents.values()) {
      await agent.shutdown();
    }

    this.logger.info('Agent orchestrator shutdown complete');
  }
}