import { AgentConfigSchema, AgentTaskSchema, AgentTypeSchema } from '../models/agent.model';
import { v4 as uuidv4 } from 'uuid';

describe('Agent Model', () => {
  describe('AgentConfigSchema', () => {
    it('should validate a complete agent configuration', () => {
      const validConfig = {
        id: uuidv4(),
        name: 'Email Categorizer',
        type: 'categorizer' as const,
        status: 'idle' as const,
        enabled: true,
        priority: 50,
        config: {
          categories: ['work', 'personal', 'spam'],
          mlModel: 'bert-base',
        },
        capabilities: ['categorize', 'filter'],
        lastRun: new Date(),
        metrics: {
          processedEmails: 1000,
          averageProcessingTime: 150,
          errorRate: 0.02,
          successRate: 0.98,
        },
      };

      const result = AgentConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should validate agent types', () => {
      const types = ['categorizer', 'prioritizer', 'summarizer', 'responder', 
                     'scheduler', 'filter', 'translator', 'security'];
      types.forEach(type => {
        const result = AgentTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });

      const invalidType = AgentTypeSchema.safeParse('invalid');
      expect(invalidType.success).toBe(false);
    });

    it('should enforce priority constraints', () => {
      const configWithInvalidPriority = {
        id: uuidv4(),
        name: 'Test Agent',
        type: 'filter',
        status: 'idle',
        enabled: true,
        priority: 150, // Invalid: > 100
        config: {},
        capabilities: [],
      };

      const result = AgentConfigSchema.safeParse(configWithInvalidPriority);
      expect(result.success).toBe(false);
    });
  });

  describe('AgentTaskSchema', () => {
    it('should validate a complete agent task', () => {
      const validTask = {
        id: uuidv4(),
        agentId: uuidv4(),
        emailId: uuidv4(),
        action: 'categorize',
        parameters: {
          model: 'bert-base',
          confidence: 0.95,
        },
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = AgentTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should validate task statuses', () => {
      const statuses = ['pending', 'processing', 'completed', 'failed'];
      statuses.forEach(status => {
        const task = {
          id: uuidv4(),
          agentId: uuidv4(),
          emailId: uuidv4(),
          action: 'test',
          parameters: {},
          status,
          createdAt: new Date(),
        };
        const result = AgentTaskSchema.safeParse(task);
        expect(result.success).toBe(true);
      });
    });

    it('should handle optional fields', () => {
      const minimalTask = {
        id: uuidv4(),
        agentId: uuidv4(),
        emailId: uuidv4(),
        action: 'test',
        parameters: {},
        status: 'pending',
        createdAt: new Date(),
      };

      const result = AgentTaskSchema.safeParse(minimalTask);
      expect(result.success).toBe(true);
    });
  });
});