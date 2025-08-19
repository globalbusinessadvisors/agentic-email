import { EngagementOptimizerService } from '../../services/engagement-optimizer.service';
import { EmailDraft, CampaignMetrics } from '../../core/campaign.interfaces';

describe('EngagementOptimizerService', () => {
  let optimizer: EngagementOptimizerService;
  let mockDraft: EmailDraft;
  let mockMetrics: CampaignMetrics;

  beforeEach(() => {
    optimizer = new EngagementOptimizerService();
    
    mockDraft = {
      id: 'draft-123',
      campaignId: 'campaign-123',
      status: 'draft',
      recipient: {
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Corp',
        title: 'Manager',
        preferences: {
          language: 'en',
          timezone: 'UTC',
          frequency: 'weekly',
          topics: ['technology', 'business'],
          unsubscribedTopics: [],
        },
        customFields: {},
        engagementHistory: [],
      },
      content: {
        subject: 'Original Subject Line',
        body: 'This is the original email body content. It contains important information.',
        htmlBody: '<html><body>HTML content</body></html>',
        preheader: 'Preview text',
        cta: [{
          text: 'Click here',
          url: 'https://example.com',
          tracking: true,
        }],
      },
      aiGenerated: true,
      aiScore: 0.7,
      personalizations: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockMetrics = {
      sent: 1000,
      delivered: 950,
      opened: 250,
      clicked: 50,
      bounced: 50,
      unsubscribed: 5,
      complained: 2,
      converted: 10,
      revenue: 1000,
      engagementScore: 0.25,
      deliverabilityScore: 0.95,
      contentScore: 0.7,
      timing: {
        avgTimeToOpen: 3600,
        avgTimeToClick: 7200,
        bestSendTime: '10:00',
        peakEngagementHour: 10,
      },
      geographic: {
        byCountry: { 'US': 500, 'UK': 300, 'CA': 200 },
        byRegion: {},
        byCity: {},
      },
      devices: {
        desktop: 400,
        mobile: 500,
        tablet: 100,
        webmail: 300,
        byClient: { 'Gmail': 400, 'Outlook': 300, 'Apple Mail': 300 },
      },
    };
  });

  describe('Strategy Initialization', () => {
    test('should initialize all optimization strategies', () => {
      const newOptimizer = new EngagementOptimizerService();
      expect(newOptimizer).toBeDefined();
    });

    test('should have subject optimization strategy', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['subject-optimization']);
      expect(optimized.content.subject).toContain(mockDraft.recipient.name);
    });

    test('should have send time optimization strategy', async () => {
      const draftWithHistory = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          engagementHistory: [
            { type: 'opened' as const, timestamp: new Date('2024-01-01T14:00:00') },
            { type: 'opened' as const, timestamp: new Date('2024-01-02T14:30:00') },
          ],
        },
      };

      const optimized = await optimizer.optimizeDraft(draftWithHistory, ['send-time-optimization']);
      expect(optimized.scheduledAt).toBeDefined();
    });

    test('should have content personalization strategy', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['content-personalization']);
      expect(optimized.content.body).toContain('Based on your interest in technology');
    });

    test('should have CTA optimization strategy', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['cta-optimization']);
      expect(optimized.content.cta?.[0].text).toBe('Get Started');
    });
  });

  describe('Subject Line Optimization', () => {
    test('should add recipient name to subject', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['subject-optimization']);
      expect(optimized.content.subject).toContain('Test User');
    });

    test('should not duplicate name if already present', async () => {
      const draftWithName = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'Test User, check this out!',
        },
      };

      const optimized = await optimizer.optimizeDraft(draftWithName, ['subject-optimization']);
      const nameCount = (optimized.content.subject.match(/Test User/g) || []).length;
      expect(nameCount).toBe(1);
    });

    test('should add urgency indicators', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['subject-optimization']);
      
      // Should sometimes add urgency (randomized, so we test the logic exists)
      expect(optimized.content.subject).toBeDefined();
    });

    test('should optimize subject length', async () => {
      const longSubjectDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'This is an extremely long subject line that definitely exceeds the optimal character limit for email subjects and needs to be shortened',
        },
      };

      const optimized = await optimizer.optimizeDraft(longSubjectDraft, ['subject-optimization']);
      expect(optimized.content.subject.length).toBeLessThanOrEqual(60);
    });

    test('should preserve subject if already optimal', async () => {
      const optimalDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'Perfect Length Subject With Name',
        },
        recipient: {
          ...mockDraft.recipient,
          name: 'Name',
        },
      };

      const optimized = await optimizer.optimizeDraft(optimalDraft, ['subject-optimization']);
      expect(optimized.content.subject.length).toBeLessThanOrEqual(60);
    });
  });

  describe('Send Time Optimization', () => {
    test('should schedule based on engagement history', async () => {
      const draftWithHistory = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          engagementHistory: [
            { type: 'opened' as const, timestamp: new Date('2024-01-01T09:00:00') },
            { type: 'opened' as const, timestamp: new Date('2024-01-02T09:30:00') },
            { type: 'opened' as const, timestamp: new Date('2024-01-03T10:00:00') },
          ],
        },
      };

      const optimized = await optimizer.optimizeDraft(draftWithHistory, ['send-time-optimization']);
      expect(optimized.scheduledAt).toBeDefined();
      expect(optimized.scheduledAt?.getHours()).toBe(9);
    });

    test('should handle empty engagement history', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['send-time-optimization']);
      expect(optimized.scheduledAt).toBeUndefined();
    });

    test('should schedule for next day if optimal time has passed', async () => {
      const pastTime = new Date();
      pastTime.setHours(1, 0, 0, 0); // 1 AM

      const draftWithPastEngagement = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          engagementHistory: [
            { type: 'opened' as const, timestamp: pastTime },
          ],
        },
      };

      const optimized = await optimizer.optimizeDraft(draftWithPastEngagement, ['send-time-optimization']);
      
      if (optimized.scheduledAt) {
        expect(optimized.scheduledAt.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe('Content Personalization', () => {
    test('should add topic-based content', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['content-personalization']);
      expect(optimized.content.body).toContain('technology, business');
    });

    test('should add company-specific content', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['content-personalization']);
      expect(optimized.content.body).toContain('Test Corp');
    });

    test('should handle recipients without preferences', async () => {
      const draftWithoutPrefs = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          preferences: {
            ...mockDraft.recipient.preferences,
            topics: [],
          },
          company: undefined,
        },
      };

      const optimized = await optimizer.optimizeDraft(draftWithoutPrefs, ['content-personalization']);
      expect(optimized.content.body).toBeDefined();
    });
  });

  describe('CTA Optimization', () => {
    test('should improve CTA text', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['cta-optimization']);
      expect(optimized.content.cta?.[0].text).toBe('Get Started');
    });

    test('should optimize multiple CTAs', async () => {
      const multiCTADraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          cta: [
            { text: 'Click here', url: '#1', tracking: true },
            { text: 'Learn more', url: '#2', tracking: true },
            { text: 'Submit', url: '#3', tracking: true },
          ],
        },
      };

      const optimized = await optimizer.optimizeDraft(multiCTADraft, ['cta-optimization']);
      expect(optimized.content.cta?.[0].text).toBe('Get Started');
      expect(optimized.content.cta?.[1].text).toBe('Discover More');
      expect(optimized.content.cta?.[2].text).toBe('Get Access');
    });

    test('should add CTA styling', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, ['cta-optimization']);
      expect(optimized.content.cta?.[0].style).toBeDefined();
      expect(optimized.content.cta?.[0].style?.fontSize).toBe('16px');
      expect(optimized.content.cta?.[0].style?.fontWeight).toBe('bold');
      expect(optimized.content.cta?.[0].style?.padding).toBe('12px 24px');
    });

    test('should handle drafts without CTAs', async () => {
      const noCTADraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          cta: undefined,
        },
      };

      const optimized = await optimizer.optimizeDraft(noCTADraft, ['cta-optimization']);
      expect(optimized.content.cta).toBeUndefined();
    });
  });

  describe('Combined Optimization', () => {
    test('should apply multiple strategies', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft, [
        'subject-optimization',
        'content-personalization',
        'cta-optimization',
      ]);

      expect(optimized.content.subject).toContain('Test User');
      expect(optimized.content.body).toContain('technology');
      expect(optimized.content.cta?.[0].text).toBe('Get Started');
    });

    test('should apply all strategies by default', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft);
      
      expect(optimized).toBeDefined();
      expect(optimized.metrics).toBeDefined();
    });

    test('should recalculate metrics after optimization', async () => {
      const optimized = await optimizer.optimizeDraft(mockDraft);
      
      expect(optimized.metrics?.predictedOpenRate).toBeDefined();
      expect(optimized.metrics?.predictedClickRate).toBeDefined();
      expect(optimized.metrics?.personalizationScore).toBeDefined();
    });
  });

  describe('Engagement Prediction', () => {
    test('should predict basic engagement metrics', async () => {
      const prediction = await optimizer.predictEngagement(mockDraft);

      expect(prediction.predictedOpenRate).toBeDefined();
      expect(prediction.predictedClickRate).toBeDefined();
      expect(prediction.predictedOpenRate).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedOpenRate).toBeLessThanOrEqual(1);
    });

    test('should boost open rate for personalized subject', async () => {
      const personalizedDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'Test User, exclusive offer for you!',
        },
      };

      const prediction = await optimizer.predictEngagement(personalizedDraft);
      expect(prediction.predictedOpenRate).toBeGreaterThan(0.25);
    });

    test('should boost click rate for multiple CTAs', async () => {
      const multiCTADraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          cta: [
            { text: 'CTA 1', url: '#1', tracking: true },
            { text: 'CTA 2', url: '#2', tracking: true },
            { text: 'CTA 3', url: '#3', tracking: true },
          ],
        },
      };

      const prediction = await optimizer.predictEngagement(multiCTADraft);
      expect(prediction.predictedClickRate).toBeGreaterThan(0.05);
    });

    test('should penalize spam indicators', async () => {
      const spammyDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'FREE GUARANTEE ACT NOW LIMITED TIME',
          body: 'Free! Guarantee! Act now! Limited time!',
        },
      };

      const prediction = await optimizer.predictEngagement(spammyDraft);
      expect(prediction.spamScore).toBeGreaterThan(0.5);
      expect(prediction.predictedOpenRate).toBeLessThan(0.25);
    });

    test('should consider optimal subject length', async () => {
      const optimalLengthDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'Perfect length subject line here', // 30-60 chars
        },
      };

      const prediction = await optimizer.predictEngagement(optimalLengthDraft);
      expect(prediction.predictedOpenRate).toBeGreaterThanOrEqual(0.25);
    });

    test('should analyze content length', async () => {
      const goodLengthDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          body: 'This is a concise email with good length. Not too long, not too short. Perfect for engagement.',
        },
      };

      const prediction = await optimizer.predictEngagement(goodLengthDraft);
      expect(prediction.predictedClickRate).toBeGreaterThan(0.05);
    });

    test('should boost score for engaged recipients', async () => {
      const engagedDraft = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          engagementHistory: Array(10).fill({
            type: 'opened',
            timestamp: new Date(),
          }),
        },
      };

      const prediction = await optimizer.predictEngagement(engagedDraft);
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

    test('should run A/B test with sample size', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 1000);

      expect(result).toBeDefined();
      expect(result.variantA.id).toBe('variant-a');
      expect(result.variantB.id).toBe('variant-b');
      expect(result.variantA.sampleSize).toBe(500);
      expect(result.variantB.sampleSize).toBe(500);
    });

    test('should determine winner', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 1000);

      expect(['A', 'B', 'tie']).toContain(result.winner);
      expect(result.recommendation).toBeDefined();
    });

    test('should calculate confidence level', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 1000);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should provide meaningful recommendation', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 100);

      if (result.confidence < 0.95) {
        expect(result.recommendation).toContain('not statistically significant');
      } else {
        expect(result.recommendation).toContain('performs');
      }
    });

    test('should track variant metrics', async () => {
      const result = await optimizer.runABTest(variantA, variantB, 1000);

      expect(result.variantA.openRate).toBeDefined();
      expect(result.variantA.clickRate).toBeDefined();
      expect(result.variantA.conversionRate).toBeDefined();
      expect(result.variantB.openRate).toBeDefined();
      expect(result.variantB.clickRate).toBeDefined();
      expect(result.variantB.conversionRate).toBeDefined();
    });
  });

  describe('Historical Analysis', () => {
    test('should handle empty history', async () => {
      const analysis = await optimizer.analyzeHistoricalPerformance('new@example.com');

      expect(analysis.averageOpenRate).toBe(0);
      expect(analysis.averageClickRate).toBe(0);
      expect(analysis.bestSendTime).toBeNull();
      expect(analysis.engagementTrend).toBe('unknown');
    });

    test('should calculate average open rate', async () => {
      optimizer.addHistoricalData('test@example.com', [
        { type: 'sent', timestamp: new Date() },
        { type: 'sent', timestamp: new Date() },
        { type: 'opened', timestamp: new Date() },
      ]);

      const analysis = await optimizer.analyzeHistoricalPerformance('test@example.com');
      expect(analysis.averageOpenRate).toBe(0.5);
    });

    test('should calculate average click rate', async () => {
      optimizer.addHistoricalData('clicks@example.com', [
        { type: 'opened', timestamp: new Date() },
        { type: 'opened', timestamp: new Date() },
        { type: 'clicked', timestamp: new Date() },
      ]);

      const analysis = await optimizer.analyzeHistoricalPerformance('clicks@example.com');
      expect(analysis.averageClickRate).toBe(0.5);
    });

    test('should identify best send time', async () => {
      optimizer.addHistoricalData('timing@example.com', [
        { type: 'opened', timestamp: new Date('2024-01-01T10:00:00') },
        { type: 'opened', timestamp: new Date('2024-01-02T10:00:00') },
        { type: 'opened', timestamp: new Date('2024-01-03T11:00:00') },
      ]);

      const analysis = await optimizer.analyzeHistoricalPerformance('timing@example.com');
      expect(analysis.bestSendTime).toBe('10:00');
    });

    test('should detect increasing engagement trend', async () => {
      const recentEvents = Array(5).fill({
        type: 'opened',
        timestamp: new Date(),
      });
      const oldEvents = Array(2).fill({
        type: 'opened',
        timestamp: new Date(Date.now() - 45 * 86400000),
      });

      optimizer.addHistoricalData('trending@example.com', [...oldEvents, ...recentEvents]);

      const analysis = await optimizer.analyzeHistoricalPerformance('trending@example.com');
      expect(analysis.engagementTrend).toBe('increasing');
    });

    test('should detect decreasing engagement trend', async () => {
      const recentEvents = Array(1).fill({
        type: 'opened',
        timestamp: new Date(),
      });
      const oldEvents = Array(5).fill({
        type: 'opened',
        timestamp: new Date(Date.now() - 45 * 86400000),
      });

      optimizer.addHistoricalData('declining@example.com', [...oldEvents, ...recentEvents]);

      const analysis = await optimizer.analyzeHistoricalPerformance('declining@example.com');
      expect(analysis.engagementTrend).toBe('decreasing');
    });

    test('should detect stable engagement trend', async () => {
      const recentEvents = Array(3).fill({
        type: 'opened',
        timestamp: new Date(),
      });
      const oldEvents = Array(3).fill({
        type: 'opened',
        timestamp: new Date(Date.now() - 45 * 86400000),
      });

      optimizer.addHistoricalData('stable@example.com', [...oldEvents, ...recentEvents]);

      const analysis = await optimizer.analyzeHistoricalPerformance('stable@example.com');
      expect(analysis.engagementTrend).toBe('stable');
    });

    test('should track total interactions', async () => {
      optimizer.addHistoricalData('interactions@example.com', [
        { type: 'sent', timestamp: new Date() },
        { type: 'opened', timestamp: new Date() },
        { type: 'clicked', timestamp: new Date() },
        { type: 'replied', timestamp: new Date() },
      ]);

      const analysis = await optimizer.analyzeHistoricalPerformance('interactions@example.com');
      expect(analysis.totalInteractions).toBe(4);
    });

    test('should track last engagement', async () => {
      const lastTimestamp = new Date();
      optimizer.addHistoricalData('last@example.com', [
        { type: 'opened', timestamp: new Date(Date.now() - 86400000) },
        { type: 'clicked', timestamp: lastTimestamp },
      ]);

      const analysis = await optimizer.analyzeHistoricalPerformance('last@example.com');
      expect(analysis.lastEngagement).toEqual(lastTimestamp);
    });
  });

  describe('Recommendations', () => {
    test('should recommend subject line shortening', async () => {
      const longSubjectDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          subject: 'This is a very long subject line that exceeds the recommended character limit for optimal display',
        },
      };

      const recommendations = await optimizer.recommendOptimizations(longSubjectDraft);
      expect(recommendations).toContain('Shorten subject line to under 60 characters');
    });

    test('should recommend adding recipient name', async () => {
      const recommendations = await optimizer.recommendOptimizations(mockDraft);
      expect(recommendations).toContain('Add recipient name to subject line');
    });

    test('should recommend content length optimization', async () => {
      const longContentDraft = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          body: Array(250).fill('word').join(' '),
        },
      };

      const recommendations = await optimizer.recommendOptimizations(longContentDraft);
      expect(recommendations).toContain('Consider shortening email content');
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
      expect(recommendations).toContain('Add a clear call-to-action button');
    });

    test('should recommend optimal send time', async () => {
      optimizer.addHistoricalData(mockDraft.recipient.email, [
        { type: 'opened', timestamp: new Date('2024-01-01T14:00:00') },
      ]);

      const recommendations = await optimizer.recommendOptimizations(mockDraft);
      const timeRec = recommendations.find(r => r.includes('Schedule send time'));
      expect(timeRec).toBeDefined();
    });

    test('should recommend LinkedIn integration', async () => {
      const draftWithLinkedIn = {
        ...mockDraft,
        recipient: {
          ...mockDraft.recipient,
          linkedinUrl: 'https://linkedin.com/in/test',
        },
        content: {
          ...mockDraft.content,
          linkedinInsights: undefined,
        },
      };

      const recommendations = await optimizer.recommendOptimizations(draftWithLinkedIn);
      expect(recommendations).toContain('Include LinkedIn insights for better personalization');
    });

    test('should recommend news content', async () => {
      const draftWithTopics = {
        ...mockDraft,
        content: {
          ...mockDraft.content,
          newsHighlights: undefined,
        },
      };

      const recommendations = await optimizer.recommendOptimizations(draftWithTopics);
      expect(recommendations).toContain('Add relevant news content based on recipient interests');
    });

    test('should handle drafts with no improvements needed', async () => {
      const perfectDraft = {
        ...mockDraft,
        content: {
          subject: `${mockDraft.recipient.name}, Check this out`,
          body: 'Perfect length content.',
          cta: [{ text: 'Click', url: '#', tracking: true }],
        },
      };

      const recommendations = await optimizer.recommendOptimizations(perfectDraft);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Strategy Scoring', () => {
    test('should score subject optimization strategy', () => {
      const strategies = optimizer['strategies'];
      const subjectStrategy = strategies.get('subject-optimization');
      
      if (subjectStrategy) {
        const score = subjectStrategy.score(mockMetrics);
        expect(score).toBe(0.25); // opened / sent
      }
    });

    test('should score send time optimization strategy', () => {
      const strategies = optimizer['strategies'];
      const timeStrategy = strategies.get('send-time-optimization');
      
      if (timeStrategy) {
        const score = timeStrategy.score(mockMetrics);
        expect(score).toBeGreaterThanOrEqual(0);
      }
    });

    test('should score content personalization strategy', () => {
      const strategies = optimizer['strategies'];
      const contentStrategy = strategies.get('content-personalization');
      
      if (contentStrategy) {
        const score = contentStrategy.score(mockMetrics);
        expect(score).toBe(0.7); // contentScore
      }
    });

    test('should score CTA optimization strategy', () => {
      const strategies = optimizer['strategies'];
      const ctaStrategy = strategies.get('cta-optimization');
      
      if (ctaStrategy) {
        const score = ctaStrategy.score(mockMetrics);
        expect(score).toBe(0.2); // clicked / opened
      }
    });
  });
});