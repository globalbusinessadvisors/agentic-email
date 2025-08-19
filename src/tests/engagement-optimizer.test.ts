import { EngagementOptimizerService } from '../services/engagement-optimizer.service';
import { EmailDraft } from '../core/campaign.interfaces';

describe('EngagementOptimizerService', () => {
  let optimizer: EngagementOptimizerService;
  let mockDraft: EmailDraft;

  beforeEach(() => {
    optimizer = new EngagementOptimizerService();
    
    mockDraft = {
      id: 'draft-1',
      campaignId: 'campaign-1',
      status: 'draft',
      recipient: {
        email: 'test@example.com',
        name: 'John Doe',
        company: 'Tech Corp',
        preferences: {
          language: 'en',
          timezone: 'UTC',
          frequency: 'weekly',
          topics: ['technology'],
          unsubscribedTopics: [],
        },
        customFields: {},
        engagementHistory: [],
      },
      content: {
        subject: 'Test Subject',
        body: 'Test email body content',
        cta: [{
          text: 'Click here',
          url: 'https://example.com',
          tracking: true,
        }],
      },
      aiGenerated: true,
      personalizations: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('Draft Optimization', () => {
    test('should optimize draft with all strategies', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft);

      expect(optimized).toBeDefined();
      expect(optimized.id).toBe(mockDraft.id);
      expect(optimized.metrics).toBeDefined();
    });

    test('should apply subject line optimization', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['subject-optimization']);

      expect(optimized.content.subject).toContain(mockDraft.recipient.name);
    });

    test('should optimize subject line length', async () => {
      const longSubjectDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'This is an extremely long subject line that definitely exceeds the optimal character limit',
        },
      };

      const optimized = await optimizer.optimizeDraft(longSubjectDraft, ['subject-optimization']);

      expect(optimized.content.subject.length).toBeLessThanOrEqual(60);
    });

    test('should apply send time optimization', async () => {
      const draftWithHistory = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          engagementHistory: [
            { type: 'opened' as const, timestamp: new Date('2024-01-01T10:00:00'), campaignId: 'c1' },
            { type: 'opened' as const, timestamp: new Date('2024-01-02T10:30:00'), campaignId: 'c2' },
          ],
        },
      };

      const optimized = await optimizer.optimizeDraft(draftWithHistory, ['send-time-optimization']);

      expect(optimized.scheduledAt).toBeDefined();
      expect(optimized.scheduledAt?.getHours()).toBe(10);
    });

    test('should apply content personalization', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['content-personalization']);

      expect(optimized.content.body).toContain('Based on your interest in technology');
    });

    test('should optimize CTAs', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['cta-optimization']);

      expect(optimized.content.cta?.[0].text).toBe('Get Started');
      expect(optimized.content.cta?.[0].style?.fontSize).toBe('16px');
    });
  });

  describe('Engagement Prediction', () => {
    test('should predict engagement metrics', async () => {
      const prediction = await optimizer.predictEngagement(mockDraft);

      expect(prediction.predictedOpenRate).toBeDefined();
      expect(prediction.predictedClickRate).toBeDefined();
      expect(prediction.predictedOpenRate).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedOpenRate).toBeLessThanOrEqual(1);
    });

    test('should increase open rate for personalized subject', async () => {
      const personalizedDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: `John Doe, ${mockDraft.content.subject}`,
        },
      };

      const prediction = await optimizer.predictEngagement(personalizedDraft);

      expect(prediction.predictedOpenRate).toBeGreaterThan(0.25);
    });

    test('should increase click rate for multiple CTAs', async () => {
      const multiCtaDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          cta: [
            { text: 'Primary CTA', url: 'https://example.com/1', tracking: true },
            { text: 'Secondary CTA', url: 'https://example.com/2', tracking: true },
          ],
        },
      };

      const prediction = await optimizer.predictEngagement(multiCtaDraft);

      expect(prediction.predictedClickRate).toBeGreaterThan(0.05);
    });

    test('should reduce score for spam indicators', async () => {
      const spammyDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'FREE GUARANTEE - ACT NOW!',
          body: 'Limited time offer! Free guarantee!',
        },
      };

      const prediction = await optimizer.predictEngagement(spammyDraft);

      expect(prediction.spamScore).toBeGreaterThan(0.4);
      expect(prediction.predictedOpenRate).toBeLessThan(0.25);
    });

    test('should consider engagement history', async () => {
      const engagedRecipient = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          engagementHistory: Array(10).fill({
            type: 'opened',
            timestamp: new Date(),
            campaignId: 'test',
          }),
        },
      };

      const prediction = await optimizer.predictEngagement(engagedRecipient);

      expect(prediction.predictedOpenRate).toBeGreaterThan(0.25);
    });
  });

  describe('A/B Testing', () => {
    let variantA: EmailDraft;
    let variantB: EmailDraft;

    beforeEach(() => {
      variantA = { ...mockDraft, id: 'variant-a' };
      variantB = {
        ...mockDraft,
        id: 'variant-b',
        content: {
          ...mockDraft.content,
          subject: 'Alternative Subject Line',
        },
      };
    });

    test('should run A/B test', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 100);

      expect(result).toBeDefined();
      expect(result.variantA.id).toBe('variant-a');
      expect(result.variantB.id).toBe('variant-b');
      expect(['A', 'B', 'tie']).toContain(result.winner);
    });

    test('should calculate confidence level', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 1000);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should provide recommendation', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 100);

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    test('should track sample sizes', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 200);

      expect(result.variantA.sampleSize).toBe(100);
      expect(result.variantB.sampleSize).toBe(100);
    });
  });

  describe('Historical Analysis', () => {
    test('should analyze empty history', async () => {
      const analysis = await optimizer.analyzeHistoricalPerformance('new@example.com');

      expect(analysis.averageOpenRate).toBe(0);
      expect(analysis.averageClickRate).toBe(0);
      expect(analysis.bestSendTime).toBeNull();
      expect(analysis.engagementTrend).toBe('unknown');
    });

    test('should analyze engagement history', async () => {
      optimizer.addHistoricalData('test@example.com', [
        { type: 'sent', timestamp: new Date(), campaignId: '1' },
        { type: 'opened', timestamp: new Date('2024-01-01T10:00:00'), campaignId: '1' },
        { type: 'clicked', timestamp: new Date(), campaignId: '1' },
      ]);

      const analysis = await optimizer.analyzeHistoricalPerformance('test@example.com');

      expect(analysis.averageOpenRate).toBeGreaterThan(0);
      expect(analysis.averageClickRate).toBeGreaterThan(0);
      expect(analysis.bestSendTime).toBe('10:00');
    });

    test('should detect engagement trends', async () => {
      const recentDate = new Date();
      const oldDate = new Date(Date.now() - 45 * 86400000);

      optimizer.addHistoricalData('trending@example.com', [
        { type: 'opened', timestamp: oldDate, campaignId: '1' },
        { type: 'opened', timestamp: recentDate, campaignId: '2' },
        { type: 'opened', timestamp: recentDate, campaignId: '3' },
        { type: 'clicked', timestamp: recentDate, campaignId: '3' },
      ]);

      const analysis = await optimizer.analyzeHistoricalPerformance('trending@example.com');

      expect(analysis.engagementTrend).toBe('increasing');
    });

    test('should extract preferred topics', async () => {
      optimizer.addHistoricalData('topics@example.com', [
        { type: 'opened', timestamp: new Date(), campaignId: '1' },
        { type: 'clicked', timestamp: new Date(), campaignId: '1' },
      ]);

      const analysis = await optimizer.analyzeHistoricalPerformance('topics@example.com');

      expect(analysis.preferredTopics).toBeDefined();
      expect(Array.isArray(analysis.preferredTopics)).toBe(true);
    });
  });

  describe('Recommendations', () => {
    test('should recommend subject line improvements', async () => {
      const longSubjectDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'This is an extremely long subject line that will not display well on mobile devices',
        },
      };

      const recommendations = await optimizer.recommendOptimizations(longSubjectDraft);

      expect(recommendations).toContain('Shorten subject line to under 60 characters for better mobile display');
    });

    test('should recommend personalization', async () => {
      const recommendations = await optimizer.recommendOptimizations(mockDraft);

      expect(recommendations).toContain('Add recipient name to subject line for higher open rates');
    });

    test('should recommend content length optimization', async () => {
      const longDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          body: Array(300).fill('word').join(' '),
        },
      };

      const recommendations = await optimizer.recommendOptimizations(longDraft);

      expect(recommendations).toContain('Consider shortening email content for better engagement');
    });

    test('should recommend adding CTAs', async () => {
      const noCTADraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          cta: undefined,
        },
      };

      const recommendations = await optimizer.recommendOptimizations(noCTADraft);

      expect(recommendations).toContain('Add a clear call-to-action button to improve click rates');
    });

    test('should recommend LinkedIn integration', async () => {
      const draftWithLinkedIn = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          linkedinUrl: 'https://linkedin.com/in/johndoe',
        },
      };

      const recommendations = await optimizer.recommendOptimizations(draftWithLinkedIn);

      expect(recommendations).toContain('Include LinkedIn insights for better personalization');
    });
  });

  describe('Strategy Management', () => {
    test('should apply multiple strategies sequentially', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, [
        'subject-optimization',
        'content-personalization',
        'cta-optimization',
      ]);

      expect(optimized.content.subject).toContain(mockDraft.recipient.name);
      expect(optimized.content.body).toContain('Based on your interest');
      expect(optimized.content.cta?.[0].text).not.toBe('Click here');
    });

    test('should handle invalid strategy gracefully', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['invalid-strategy']);

      expect(optimized).toBeDefined();
      expect(optimized.id).toBe(mockDraft.id);
    });

    test('should optimize without specific strategies', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft);

      expect(optimized).toBeDefined();
      expect(optimized.metrics).toBeDefined();
    });
  });

  describe('CTA Optimization', () => {
    test('should improve CTA text', async () => {
      const drafts = [
        { ...mockDraft, content: { ...mockDraft.content, cta: [{ text: 'Click here', url: '#', tracking: true }] }},
        { ...mockDraft, content: { ...mockDraft.content, cta: [{ text: 'Learn more', url: '#', tracking: true }] }},
        { ...mockDraft, content: { ...mockDraft.content, cta: [{ text: 'Submit', url: '#', tracking: true }] }},
        { ...mockDraft, content: { ...mockDraft.content, cta: [{ text: 'Download', url: '#', tracking: true }] }},
        { ...mockDraft, content: { ...mockDraft.content, cta: [{ text: 'Sign up', url: '#', tracking: true }] }},
        { ...mockDraft, content: { ...mockDraft.content, cta: [{ text: 'Buy now', url: '#', tracking: true }] }},
      ];

      const expectedTexts = ['Get Started', 'Discover More', 'Get Access', 'Get Your Copy', 'Join Now', 'Shop Now'];

      for (let i = 0; i < drafts.length; i++) {
        const optimized = await optimizer.optimizeDraft(drafts[i], ['cta-optimization']);
        expect(optimized.content.cta?.[0].text).toBe(expectedTexts[i]);
      }
    });

    test('should add CTA styling', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['cta-optimization']);

      expect(optimized.content.cta?.[0].style).toBeDefined();
      expect(optimized.content.cta?.[0].style?.fontSize).toBe('16px');
      expect(optimized.content.cta?.[0].style?.fontWeight).toBe('bold');
      expect(optimized.content.cta?.[0].style?.padding).toBe('12px 24px');
    });
  });
});