import { Email } from '../models/email.model';
import { AgentConfig } from '../models/agent.model';
import { IAgent, AgentProcessResult, AgentStatus } from '../core/interfaces';
import winston from 'winston';

export abstract class BaseAgent implements IAgent {
  public readonly id: string;
  public readonly name: string;
  public readonly type: string;
  
  protected config: AgentConfig;
  protected logger: winston.Logger;
  protected isActive: boolean = false;
  protected currentTask?: string;
  protected metrics = {
    processedCount: 0,
    errorCount: 0,
    totalTime: 0,
  };

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.config = config;

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: `agent-${this.name}` },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  abstract process(email: Email): Promise<AgentProcessResult>;

  async initialize(config: AgentConfig): Promise<void> {
    this.config = config;
    this.isActive = true;
    this.logger.info(`Agent ${this.name} initialized`);
  }

  async shutdown(): Promise<void> {
    this.isActive = false;
    this.logger.info(`Agent ${this.name} shutdown`);
  }

  getStatus(): AgentStatus {
    return {
      isActive: this.isActive,
      currentTask: this.currentTask,
      metrics: {
        processedCount: this.metrics.processedCount,
        errorCount: this.metrics.errorCount,
        averageTime: this.metrics.processedCount > 0 
          ? this.metrics.totalTime / this.metrics.processedCount 
          : 0,
      },
    };
  }

  protected async measurePerformance<T>(
    task: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.currentTask = task;

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.metrics.processedCount++;
      this.metrics.totalTime += duration;
      
      this.logger.info(`Task ${task} completed in ${duration}ms`);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      this.logger.error(`Task ${task} failed`, error);
      throw error;
    } finally {
      this.currentTask = undefined;
    }
  }
}