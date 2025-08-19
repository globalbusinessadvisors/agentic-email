import { DraftGeneratorService } from '../services/draft-generator.service';
import type { EmailCampaign, RecipientProfile } from '../core/campaign.interfaces';

describe('DraftGeneratorService', () => {
  let draftGenerator: DraftGeneratorService;
  let mockCampaign: EmailCampaign;
  let mockRecipient: RecipientProfile;

  beforeEach(() => {
    draftGenerator = new DraftGeneratorService();
    
    mockCampaign = {
      id: 'campaign-1',
      name: 'Test Campaign',
      status: 'draft',
      type: 'one-time',
      targetAudience: {
        id: 'audience-1',
        name: 'All Subscribers',
        criteria: [],
        estimatedSize: 1000,
        tags: [],
      },
      schedule: {
        startDate: new Date(),
        timezone: 'UTC',
      },
      content: {
        subject: 'Important Update',
        body: 'This is the main content of the email.',
        templates: [],
        personalization: {
          enabled: true,
          fields: [],
          dynamicContent: [],
          aiOptimization: false,
        },
      },
      deliveryConfig: {
        provider: 'smtp',
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: 60000,
          maxDelay: 3600000,
          backoffMultiplier: 2,
          retryableErrors: [],
        },
        bounceHandling: {
          enabled: true,
          categorization: true,
          autoRemove: false,
        },
        unsubscribeHandling: {
          enabled: true,
          headerMethod: true,
          linkMethod: true,
        },
      },
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
        complained: 0,
        converted: 0,
        engagementScore: 0,
        deliverabilityScore: 0,
        contentScore: 0,
        timing: {
          avgTimeToOpen: 0,
          avgTimeToClick: 0,
          bestSendTime: '10:00',
          peakEngagementHour: 10,
        },
        geographic: {
          byCountry: {},
          byRegion: {},
          byCity: {},
        },
        devices: {
          desktop: 0,
          mobile: 0,
          tablet: 0,
          webmail: 0,
          byClient: {},
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
    };

    mockRecipient = {
      email: 'recipient@example.com',
      name: 'John Doe',
      company: 'Tech Corp',
      title: 'CTO',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      customFields: {
        department: 'Engineering',
      },
      preferences: {
        language: 'en',
        timezone: 'PST',
        frequency: 'weekly',
        topics: ['technology', 'innovation'],
        unsubscribedTopics: [],
      },
      engagementHistory: [],
    };
  });

  describe('Draft Generation', () => {
    test('should generate a basic draft', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft).toBeDefined();
      expect(draft.id).toBeDefined();
      expect(draft.campaignId).toBe(mockCampaign.id);
      expect(draft.recipient.email).toBe(mockRecipient.email);
      expect(draft.aiGenerated).toBe(true);
    });

    test('should include LinkedIn insights when enabled', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, {
        includeLinkedIn: true,
      });

      expect(draft.personalizations.linkedinInsights).toBeDefined();
      expect(draft.content.linkedinInsights).toBeDefined();
    });

    test('should include news digest when enabled', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, {
        includeNews: true,
      });

      expect(draft.personalizations.newsDigest).toBeDefined();
      expect(draft.content.newsHighlights).toBeDefined();
    });

    test('should apply different tones', async () => {
      const formalDraft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, {
        tone: 'formal',
      });

      const casualDraft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, {
        tone: 'casual',
      });

      expect(formalDraft.content.body).not.toBe(casualDraft.content.body);
    });

    test('should optimize for engagement when requested', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, {
        optimizeForEngagement: true,
      });

      expect(draft.metrics).toBeDefined();
      expect(draft.metrics?.predictedOpenRate).toBeGreaterThan(0);
    });
  });

  describe('Bulk Draft Generation', () => {
    test('should generate multiple drafts', async () => {
      const recipients = [
        mockRecipient,
        { ...mockRecipient, email: 'recipient2@example.com', name: 'Jane Doe' },
        { ...mockRecipient, email: 'recipient3@example.com', name: 'Bob Smith' },
      ];

      const drafts = await draftGenerator.generateBulkDrafts(mockCampaign, recipients);

      expect(drafts).toHaveLength(3);
      expect(drafts[0].recipient.email).toBe('recipient@example.com');
      expect(drafts[1].recipient.email).toBe('recipient2@example.com');
      expect(drafts[2].recipient.email).toBe('recipient3@example.com');
    });

    test('should handle large batches', async () => {
      const recipients = Array.from({ length: 25 }, (_, i) => ({
        ...mockRecipient,
        email: `recipient${i}@example.com`,
        name: `User ${i}`,
      }));

      const drafts = await draftGenerator.generateBulkDrafts(mockCampaign, recipients);

      expect(drafts).toHaveLength(25);
    });
  });

  describe('A/B Test Variations', () => {
    test('should generate A/B test variations', async () => {
      const variations = await draftGenerator.generateABTestVariations(
        mockCampaign,
        mockRecipient,
        2
      );

      expect(variations).toHaveLength(2);
      expect(variations[0].content.subject).toContain('[Variant A]');
      expect(variations[1].content.subject).toContain('[Variant B]');
    });

    test('should apply different strategies to variations', async () => {
      const variations = await draftGenerator.generateABTestVariations(
        mockCampaign,
        mockRecipient,
        3
      );

      expect(variations).toHaveLength(3);
      // Each variation should have different optimization
      const tones = variations.map(v => v.personalizations.tone);
      expect(new Set(tones).size).toBeGreaterThan(1);
    });
  });

  describe('Personalization', () => {
    test('should personalize with recipient name', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, {
        personalizationLevel: 'high',
      });

      expect(draft.content.body).toContain(mockRecipient.name);
    });

    test('should personalize with company information', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, {
        personalizationLevel: 'high',
      });

      expect(draft.personalizations.company).toBe(mockRecipient.company);
    });

    test('should handle missing personalization data gracefully', async () => {
      const recipientWithoutData = {
        ...mockRecipient,
        name: undefined,
        company: undefined,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, recipientWithoutData);

      expect(draft).toBeDefined();
      expect(draft.content.body).not.toContain('undefined');
    });

    test('should include engagement history in personalization', async () => {
      const recipientWithHistory = {
        ...mockRecipient,
        engagementHistory: [
          { type: 'opened' as const, timestamp: new Date(), campaignId: 'prev-1' },
          { type: 'clicked' as const, timestamp: new Date(), campaignId: 'prev-1' },
        ],
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, recipientWithHistory);

      expect(draft.personalizations.engagementLevel).toBeDefined();
    });
  });

  describe('Content Generation', () => {
    test('should generate subject line', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.subject).toBeDefined();
      expect(draft.content.subject.length).toBeGreaterThan(0);
    });

    test('should generate preheader text', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.preheader).toBeDefined();
      expect(draft.content.preheader?.length).toBeLessThanOrEqual(150);
    });

    test('should generate HTML content', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.htmlBody).toBeDefined();
      expect(draft.content.htmlBody).toContain('<!DOCTYPE html>');
      expect(draft.content.htmlBody).toContain('<body>');
    });

    test('should include CTAs in content', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.cta).toBeDefined();
      expect(draft.content.cta?.length).toBeGreaterThan(0);
      expect(draft.content.cta?.[0].text).toBeDefined();
      expect(draft.content.cta?.[0].url).toBeDefined();
    });

    test('should optimize subject line length', async () => {
      const longSubjectCampaign = {
        ...mockCampaign,
        content: {
          ...mockCampaign.content,
          subject: 'This is a very long subject line that exceeds the recommended character limit for email subjects',
        },
      };

      const draft = await draftGenerator.generateDraft(longSubjectCampaign, mockRecipient);

      expect(draft.content.subject.length).toBeLessThanOrEqual(60);
    });
  });

  describe('Metrics Calculation', () => {
    test('should calculate draft metrics', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.metrics).toBeDefined();
      expect(draft.metrics?.predictedOpenRate).toBeGreaterThanOrEqual(0);
      expect(draft.metrics?.predictedOpenRate).toBeLessThanOrEqual(1);
      expect(draft.metrics?.predictedClickRate).toBeGreaterThanOrEqual(0);
      expect(draft.metrics?.predictedClickRate).toBeLessThanOrEqual(1);
    });

    test('should calculate readability score', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.metrics?.readabilityScore).toBeDefined();
      expect(draft.metrics?.readabilityScore).toBeGreaterThanOrEqual(0);
      expect(draft.metrics?.readabilityScore).toBeLessThanOrEqual(1);
    });

    test('should calculate spam score', async () => {
      const spammyCampaign = {
        ...mockCampaign,
        content: {
          ...mockCampaign.content,
          subject: 'FREE LIMITED TIME GUARANTEE',
          body: 'Act now! Free guarantee! Limited time offer!',
        },
      };

      const draft = await draftGenerator.generateDraft(spammyCampaign, mockRecipient);

      expect(draft.metrics?.spamScore).toBeGreaterThan(0.5);
    });

    test('should calculate personalization score', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, {
        personalizationLevel: 'high',
        includeLinkedIn: true,
        includeNews: true,
      });

      expect(draft.metrics?.personalizationScore).toBeGreaterThan(0.5);
    });

    test('should calculate AI score', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.aiScore).toBeDefined();
      expect(draft.aiScore).toBeGreaterThanOrEqual(0);
      expect(draft.aiScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Template Selection', () => {
    test('should select appropriate template for campaign type', async () => {
      const newsletterCampaign = { ...mockCampaign, type: 'newsletter' as const };
      const draft = await draftGenerator.generateDraft(newsletterCampaign, mockRecipient);

      expect(draft.content.body).toBeDefined();
    });

    test('should use follow-up template for follow-up campaigns', async () => {
      const followUpCampaign = { ...mockCampaign, type: 'follow_up' as const };
      const draft = await draftGenerator.generateDraft(followUpCampaign, mockRecipient);

      expect(draft.content.body).toBeDefined();
    });

    test('should fall back to default template', async () => {
      const customCampaign = { ...mockCampaign, type: 'custom' as const };
      const draft = await draftGenerator.generateDraft(customCampaign, mockRecipient);

      expect(draft.content.body).toBeDefined();
    });
  });
});