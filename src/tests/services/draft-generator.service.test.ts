import { DraftGeneratorService, GenerationOptions } from '../../services/draft-generator.service';
import { EmailCampaign, RecipientProfile, EmailDraft } from '../../core/campaign.interfaces';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: { content: 'AI Generated Subject Line' }
          }]
        })
      }
    }
  }));
});

// Mock LinkedIn Service
jest.mock('../../integrations/linkedin.service', () => {
  return {
    LinkedInService: jest.fn().mockImplementation(() => ({
      fetchProfile: jest.fn().mockResolvedValue({
        url: 'https://linkedin.com/in/test',
        name: 'John Doe',
        headline: 'Software Engineer',
        company: 'Tech Corp',
        skills: ['JavaScript', 'React', 'Node.js'],
      }),
      generateInsights: jest.fn().mockResolvedValue('Current role: Software Engineer at Tech Corp'),
    })),
  };
});

// Mock News Service
jest.mock('../../integrations/news.service', () => {
  return {
    NewsService: jest.fn().mockImplementation(() => ({
      fetchArticles: jest.fn().mockResolvedValue([
        {
          id: '1',
          title: 'Tech News',
          content: 'Latest in technology',
          url: 'https://example.com/news',
          source: 'TechCrunch',
          publishedAt: new Date(),
        },
      ]),
      generateDigest: jest.fn().mockResolvedValue('📰 News Digest\n\nTech News - Latest in technology'),
    })),
  };
});

describe('DraftGeneratorService', () => {
  let draftGenerator: DraftGeneratorService;
  let mockCampaign: EmailCampaign;
  let mockRecipient: RecipientProfile;

  beforeEach(() => {
    draftGenerator = new DraftGeneratorService();

    mockCampaign = {
      id: 'campaign-123',
      name: 'Test Campaign',
      status: 'draft',
      type: 'one-time',
      targetAudience: {
        id: 'audience-1',
        name: 'Test Audience',
        criteria: [],
        estimatedSize: 1000,
        tags: ['test'],
      },
      schedule: {
        startDate: new Date(),
        timezone: 'UTC',
      },
      content: {
        subject: 'Test Subject {{name}}',
        body: 'Hello {{name}}, this is the main content.',
        templates: [],
        personalization: {
          enabled: true,
          fields: [],
          dynamicContent: [],
          aiOptimization: true,
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
        deliverabilityScore: 1,
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
      email: 'john.doe@example.com',
      name: 'John Doe',
      company: 'Tech Corp',
      title: 'Software Engineer',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      customFields: {
        department: 'Engineering',
        location: 'San Francisco',
      },
      preferences: {
        language: 'en',
        timezone: 'PST',
        frequency: 'weekly',
        topics: ['technology', 'innovation', 'ai'],
        unsubscribedTopics: [],
      },
      engagementHistory: [],
    };
  });

  describe('Draft Generation', () => {
    test('should generate basic draft', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft).toBeDefined();
      expect(draft.id).toBeDefined();
      expect(draft.campaignId).toBe(mockCampaign.id);
      expect(draft.recipient.email).toBe(mockRecipient.email);
      expect(draft.aiGenerated).toBe(true);
      expect(draft.status).toBe('draft');
    });

    test('should personalize content with recipient name', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.body).toContain('John Doe');
      expect(draft.personalizations.name).toBe('John Doe');
    });

    test('should include company information', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.personalizations.company).toBe('Tech Corp');
      expect(draft.personalizations.title).toBe('Software Engineer');
    });

    test('should handle missing recipient data gracefully', async () => {
      const recipientWithoutName = {
        ...mockRecipient,
        name: undefined,
        company: undefined,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, recipientWithoutName);

      expect(draft.content.body).toContain('there'); // Default fallback
      expect(draft.content.body).not.toContain('undefined');
    });

    test('should calculate AI score', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.aiScore).toBeDefined();
      expect(draft.aiScore).toBeGreaterThanOrEqual(0);
      expect(draft.aiScore).toBeLessThanOrEqual(1);
    });

    test('should include metrics', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.metrics).toBeDefined();
      expect(draft.metrics?.predictedOpenRate).toBeDefined();
      expect(draft.metrics?.predictedClickRate).toBeDefined();
      expect(draft.metrics?.spamScore).toBeDefined();
      expect(draft.metrics?.readabilityScore).toBeDefined();
      expect(draft.metrics?.personalizationScore).toBeDefined();
    });
  });

  describe('LinkedIn Integration', () => {
    test('should include LinkedIn insights when enabled', async () => {
      const options: GenerationOptions = {
        includeLinkedIn: true,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.personalizations.linkedinInsights).toBeDefined();
      expect(draft.content.linkedinInsights).toBeDefined();
      expect(draft.content.linkedinInsights).toContain('Software Engineer');
    });

    test('should handle missing LinkedIn URL', async () => {
      const recipientWithoutLinkedIn = {
        ...mockRecipient,
        linkedinUrl: undefined,
      };

      const options: GenerationOptions = {
        includeLinkedIn: true,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, recipientWithoutLinkedIn, options);

      expect(draft.personalizations.linkedinInsights).toBeUndefined();
    });

    test('should include LinkedIn profile data', async () => {
      const options: GenerationOptions = {
        includeLinkedIn: true,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.personalizations.linkedinProfile).toBeDefined();
      expect(draft.personalizations.linkedinProfile.name).toBe('John Doe');
    });
  });

  describe('News Integration', () => {
    test('should include news digest when enabled', async () => {
      const options: GenerationOptions = {
        includeNews: true,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.personalizations.newsDigest).toBeDefined();
      expect(draft.content.newsHighlights).toBeDefined();
      expect(draft.content.newsHighlights).toContain('News Digest');
    });

    test('should fetch news based on recipient topics', async () => {
      const options: GenerationOptions = {
        includeNews: true,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.personalizations.newsArticles).toBeDefined();
      expect(Array.isArray(draft.personalizations.newsArticles)).toBe(true);
    });

    test('should handle recipients without topic preferences', async () => {
      const recipientWithoutTopics = {
        ...mockRecipient,
        preferences: {
          ...mockRecipient.preferences,
          topics: [],
        },
      };

      const options: GenerationOptions = {
        includeNews: true,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, recipientWithoutTopics, options);

      expect(draft.personalizations.newsDigest).toBeUndefined();
    });
  });

  describe('Tone Variations', () => {
    test('should apply formal tone', async () => {
      const options: GenerationOptions = {
        tone: 'formal',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.body).toBeDefined();
      expect(draft.personalizations).toBeDefined();
    });

    test('should apply casual tone', async () => {
      const options: GenerationOptions = {
        tone: 'casual',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.body).toBeDefined();
    });

    test('should apply professional tone', async () => {
      const options: GenerationOptions = {
        tone: 'professional',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.body).toBeDefined();
    });

    test('should apply friendly tone', async () => {
      const options: GenerationOptions = {
        tone: 'friendly',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.body).toBeDefined();
    });

    test('should apply persuasive tone', async () => {
      const options: GenerationOptions = {
        tone: 'persuasive',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.body).toBeDefined();
    });
  });

  describe('Personalization Levels', () => {
    test('should apply low personalization', async () => {
      const options: GenerationOptions = {
        personalizationLevel: 'low',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.body).toContain('great day');
      expect(draft.metrics?.personalizationScore).toBeLessThan(0.5);
    });

    test('should apply medium personalization', async () => {
      const options: GenerationOptions = {
        personalizationLevel: 'medium',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.body).toContain('Tech Corp');
    });

    test('should apply high personalization', async () => {
      const options: GenerationOptions = {
        personalizationLevel: 'high',
        includeLinkedIn: true,
        includeNews: true,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.metrics?.personalizationScore).toBeGreaterThan(0.5);
    });
  });

  describe('Content Optimization', () => {
    test('should optimize for engagement when requested', async () => {
      const options: GenerationOptions = {
        optimizeForEngagement: true,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.metrics).toBeDefined();
      expect(draft.metrics?.predictedOpenRate).toBeGreaterThan(0);
      expect(draft.metrics?.predictedClickRate).toBeGreaterThan(0);
    });

    test('should optimize subject line length', async () => {
      const campaignWithLongSubject = {
        ...mockCampaign,
        content: {
          ...mockCampaign.content,
          subject: 'This is an extremely long subject line that exceeds the recommended character limit for optimal email open rates',
        },
      };

      const draft = await draftGenerator.generateDraft(campaignWithLongSubject, mockRecipient);

      expect(draft.content.subject.length).toBeLessThanOrEqual(60);
    });

    test('should detect and score spam indicators', async () => {
      const spammyCampaign = {
        ...mockCampaign,
        content: {
          ...mockCampaign.content,
          subject: 'FREE OFFER - GUARANTEED RESULTS - ACT NOW!',
          body: 'Limited time offer! Free guarantee! Act now!',
        },
      };

      const draft = await draftGenerator.generateDraft(spammyCampaign, mockRecipient);

      expect(draft.metrics?.spamScore).toBeGreaterThan(0.5);
    });

    test('should calculate readability score', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.metrics?.readabilityScore).toBeDefined();
      expect(draft.metrics?.readabilityScore).toBeGreaterThanOrEqual(0);
      expect(draft.metrics?.readabilityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Bulk Draft Generation', () => {
    test('should generate multiple drafts', async () => {
      const recipients = [
        mockRecipient,
        { ...mockRecipient, email: 'jane@example.com', name: 'Jane Smith' },
        { ...mockRecipient, email: 'bob@example.com', name: 'Bob Johnson' },
      ];

      const drafts = await draftGenerator.generateBulkDrafts(mockCampaign, recipients);

      expect(drafts).toHaveLength(3);
      expect(drafts[0].recipient.email).toBe('john.doe@example.com');
      expect(drafts[1].recipient.email).toBe('jane@example.com');
      expect(drafts[2].recipient.email).toBe('bob@example.com');
    });

    test('should handle large batches', async () => {
      const recipients = Array.from({ length: 25 }, (_, i) => ({
        ...mockRecipient,
        email: `user${i}@example.com`,
        name: `User ${i}`,
      }));

      const drafts = await draftGenerator.generateBulkDrafts(mockCampaign, recipients);

      expect(drafts).toHaveLength(25);
    });

    test('should apply options to all drafts', async () => {
      const recipients = [mockRecipient, { ...mockRecipient, email: 'test2@example.com' }];

      const options: GenerationOptions = {
        tone: 'professional',
        includeLinkedIn: true,
      };

      const drafts = await draftGenerator.generateBulkDrafts(mockCampaign, recipients, options);

      expect(drafts[0].personalizations.linkedinInsights).toBeDefined();
      expect(drafts[1].personalizations.linkedinInsights).toBeDefined();
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

    test('should apply different tones to variations', async () => {
      const variations = await draftGenerator.generateABTestVariations(
        mockCampaign,
        mockRecipient,
        3
      );

      expect(variations).toHaveLength(3);
      // Each variation should have been generated with different options
      expect(variations[0].id).not.toBe(variations[1].id);
      expect(variations[1].id).not.toBe(variations[2].id);
    });

    test('should optimize all variations', async () => {
      const variations = await draftGenerator.generateABTestVariations(
        mockCampaign,
        mockRecipient,
        2
      );

      expect(variations[0].metrics).toBeDefined();
      expect(variations[1].metrics).toBeDefined();
    });
  });

  describe('Template Management', () => {
    test('should select template based on campaign type', async () => {
      const newsletterCampaign = {
        ...mockCampaign,
        type: 'newsletter' as const,
      };

      const draft = await draftGenerator.generateDraft(newsletterCampaign, mockRecipient);

      expect(draft.content.body).toBeDefined();
    });

    test('should use follow-up template', async () => {
      const followUpCampaign = {
        ...mockCampaign,
        type: 'follow_up' as const,
      };

      const draft = await draftGenerator.generateDraft(followUpCampaign, mockRecipient);

      expect(draft.content.body).toBeDefined();
    });

    test('should fallback to default template', async () => {
      const customCampaign = {
        ...mockCampaign,
        type: 'custom' as any,
      };

      const draft = await draftGenerator.generateDraft(customCampaign, mockRecipient);

      expect(draft.content.body).toBeDefined();
    });
  });

  describe('CTA Generation', () => {
    test('should generate CTAs', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.cta).toBeDefined();
      expect(draft.content.cta?.length).toBeGreaterThan(0);
      expect(draft.content.cta?.[0].text).toBe('Learn More');
      expect(draft.content.cta?.[0].url).toContain(mockCampaign.id);
      expect(draft.content.cta?.[0].tracking).toBe(true);
    });

    test('should add webinar CTA for interested recipients', async () => {
      const recipientWithWebinarInterest = {
        ...mockRecipient,
        preferences: {
          ...mockRecipient.preferences,
          topics: ['webinar'],
        },
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, recipientWithWebinarInterest);

      const webinarCTA = draft.content.cta?.find(cta => cta.text === 'Register for Webinar');
      expect(webinarCTA).toBeDefined();
    });

    test('should include CTA styling', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.cta?.[0].style).toBeDefined();
      expect(draft.content.cta?.[0].style?.backgroundColor).toBe('#007bff');
      expect(draft.content.cta?.[0].style?.color).toBe('#ffffff');
    });
  });

  describe('HTML Generation', () => {
    test('should generate HTML version', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.htmlBody).toBeDefined();
      expect(draft.content.htmlBody).toContain('<!DOCTYPE html>');
      expect(draft.content.htmlBody).toContain('<body>');
      expect(draft.content.htmlBody).toContain('</html>');
    });

    test('should include CTAs in HTML', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.htmlBody).toContain('cta-button');
      expect(draft.content.htmlBody).toContain('Learn More');
    });

    test('should apply responsive styles', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.htmlBody).toContain('max-width: 600px');
      expect(draft.content.htmlBody).toContain('viewport');
    });
  });

  describe('Preheader Generation', () => {
    test('should generate preheader text', async () => {
      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient);

      expect(draft.content.preheader).toBeDefined();
      expect(draft.content.preheader?.length).toBeGreaterThan(0);
    });

    test('should limit preheader length for short content', async () => {
      const options: GenerationOptions = {
        length: 'short',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.preheader?.length).toBeLessThanOrEqual(50);
    });

    test('should limit preheader length for long content', async () => {
      const options: GenerationOptions = {
        length: 'long',
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, mockRecipient, options);

      expect(draft.content.preheader?.length).toBeLessThanOrEqual(150);
    });
  });

  describe('Engagement History Analysis', () => {
    test('should analyze engagement history', async () => {
      const recipientWithHistory = {
        ...mockRecipient,
        engagementHistory: [
          { type: 'opened' as const, timestamp: new Date(Date.now() - 86400000) },
          { type: 'clicked' as const, timestamp: new Date(Date.now() - 172800000) },
          { type: 'opened' as const, timestamp: new Date(Date.now() - 259200000) },
        ],
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, recipientWithHistory);

      expect(draft.personalizations.engagementLevel).toBe('medium');
    });

    test('should identify high engagement', async () => {
      const engagementEvents = Array.from({ length: 10 }, (_, i) => ({
        type: 'opened' as const,
        timestamp: new Date(Date.now() - i * 86400000),
      }));

      const highEngagementRecipient = {
        ...mockRecipient,
        engagementHistory: engagementEvents,
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, highEngagementRecipient);

      expect(draft.personalizations.engagementLevel).toBe('high');
    });

    test('should identify low engagement', async () => {
      const lowEngagementRecipient = {
        ...mockRecipient,
        engagementHistory: [
          { type: 'opened' as const, timestamp: new Date(Date.now() - 15 * 86400000) },
        ],
      };

      const draft = await draftGenerator.generateDraft(mockCampaign, lowEngagementRecipient);

      expect(draft.personalizations.engagementLevel).toBe('low');
    });
  });
});