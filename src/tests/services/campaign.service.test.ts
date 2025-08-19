import { CampaignService } from '../../services/campaign.service';
import { DatabaseService } from '../../services/database.service';
import { CampaignStatus, EmailCampaign, CampaignSchedule } from '../../core/campaign.interfaces';

// Mock Redis
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    process: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    on: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
  }));
});

// Mock database
jest.mock('../../services/database.service');

describe('CampaignService', () => {
  let campaignService: CampaignService;
  let mockDatabase: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDatabase = new DatabaseService() as jest.Mocked<DatabaseService>;
    campaignService = new CampaignService(mockDatabase);
  });

  describe('Campaign Creation', () => {
    test('should create campaign with default values', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Test Campaign',
      });

      expect(campaign).toMatchObject({
        name: 'Test Campaign',
        status: 'draft',
        type: 'one-time',
      });
      expect(campaign.id).toBeDefined();
      expect(campaign.createdAt).toBeInstanceOf(Date);
    });

    test('should create campaign with custom values', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Custom Campaign',
        description: 'Test description',
        type: 'recurring',
        status: 'draft' as CampaignStatus,
      });

      expect(campaign.name).toBe('Custom Campaign');
      expect(campaign.description).toBe('Test description');
      expect(campaign.type).toBe('recurring');
    });

    test('should initialize metrics correctly', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Metrics Test',
      });

      expect(campaign.metrics).toMatchObject({
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
        complained: 0,
        converted: 0,
      });
    });

    test('should set delivery configuration', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Delivery Test',
      });

      expect(campaign.deliveryConfig).toMatchObject({
        provider: 'smtp',
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: 60000,
        },
        bounceHandling: {
          enabled: true,
          categorization: true,
        },
      });
    });

    test('should handle campaign content', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Content Test',
        content: {
          subject: 'Test Subject',
          body: 'Test Body',
          templates: [],
          personalization: {
            enabled: true,
            fields: [],
            dynamicContent: [],
            aiOptimization: true,
          },
        },
      });

      expect(campaign.content.subject).toBe('Test Subject');
      expect(campaign.content.body).toBe('Test Body');
      expect(campaign.content.personalization.enabled).toBe(true);
    });
  });

  describe('Campaign Updates', () => {
    let testCampaign: EmailCampaign;

    beforeEach(async () => {
      testCampaign = await campaignService.createCampaign({
        name: 'Update Test',
      });
    });

    test('should update campaign name', async () => {
      const updated = await campaignService.updateCampaign(testCampaign.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe(testCampaign.id);
    });

    test('should update campaign status', async () => {
      const updated = await campaignService.updateCampaign(testCampaign.id, {
        status: 'active' as CampaignStatus,
      });

      expect(updated.status).toBe('active');
    });

    test('should update timestamp on modification', async () => {
      const original = testCampaign.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await campaignService.updateCampaign(testCampaign.id, {
        description: 'New description',
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(original.getTime());
    });

    test('should throw error for non-existent campaign', async () => {
      await expect(
        campaignService.updateCampaign('non-existent', { name: 'Test' })
      ).rejects.toThrow('Campaign non-existent not found');
    });

    test('should preserve unmodified fields', async () => {
      const updated = await campaignService.updateCampaign(testCampaign.id, {
        description: 'Only update description',
      });

      expect(updated.name).toBe(testCampaign.name);
      expect(updated.type).toBe(testCampaign.type);
      expect(updated.description).toBe('Only update description');
    });
  });

  describe('Campaign Retrieval', () => {
    test('should retrieve campaign by ID', async () => {
      const created = await campaignService.createCampaign({
        name: 'Retrieve Test',
      });

      const retrieved = await campaignService.getCampaign(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Retrieve Test');
    });

    test('should return null for non-existent campaign', async () => {
      const retrieved = await campaignService.getCampaign('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should cache retrieved campaigns', async () => {
      const created = await campaignService.createCampaign({
        name: 'Cache Test',
      });

      const first = await campaignService.getCampaign(created.id);
      const second = await campaignService.getCampaign(created.id);

      expect(first).toBe(second); // Same reference
    });
  });

  describe('Campaign Listing', () => {
    beforeEach(async () => {
      // Create test campaigns
      await campaignService.createCampaign({
        name: 'Campaign A',
        status: 'active' as CampaignStatus,
        createdBy: 'user1',
      });
      await campaignService.createCampaign({
        name: 'Campaign B',
        status: 'draft' as CampaignStatus,
        createdBy: 'user2',
      });
      await campaignService.createCampaign({
        name: 'Campaign C',
        status: 'completed' as CampaignStatus,
        createdBy: 'user1',
      });
    });

    test('should list all campaigns', async () => {
      const campaigns = await campaignService.listCampaigns();
      expect(campaigns.length).toBeGreaterThanOrEqual(3);
    });

    test('should filter by status', async () => {
      const active = await campaignService.listCampaigns({
        status: ['active'],
      });

      expect(active.every(c => c.status === 'active')).toBe(true);
    });

    test('should filter by creator', async () => {
      const user1Campaigns = await campaignService.listCampaigns({
        createdBy: 'user1',
      });

      expect(user1Campaigns.every(c => c.createdBy === 'user1')).toBe(true);
    });

    test('should sort by name ascending', async () => {
      const sorted = await campaignService.listCampaigns({
        sortBy: 'name',
        sortOrder: 'asc',
      });

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].name >= sorted[i - 1].name).toBe(true);
      }
    });

    test('should sort by name descending', async () => {
      const sorted = await campaignService.listCampaigns({
        sortBy: 'name',
        sortOrder: 'desc',
      });

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].name <= sorted[i - 1].name).toBe(true);
      }
    });

    test('should paginate results', async () => {
      const page1 = await campaignService.listCampaigns({
        limit: 2,
        offset: 0,
      });

      const page2 = await campaignService.listCampaigns({
        limit: 2,
        offset: 2,
      });

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeGreaterThan(0);
      expect(page1[0].id).not.toBe(page2[0]?.id);
    });

    test('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      
      const recent = await campaignService.listCampaigns({
        dateFrom: yesterday,
        dateTo: now,
      });

      expect(recent.every(c => c.createdAt >= yesterday && c.createdAt <= now)).toBe(true);
    });
  });

  describe('Campaign Deletion', () => {
    test('should delete existing campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'To Delete',
      });

      const deleted = await campaignService.deleteCampaign(campaign.id);
      expect(deleted).toBe(true);

      const retrieved = await campaignService.getCampaign(campaign.id);
      expect(retrieved).toBeNull();
    });

    test('should return false for non-existent campaign', async () => {
      const deleted = await campaignService.deleteCampaign('non-existent');
      expect(deleted).toBe(false);
    });

    test('should cancel scheduled jobs on deletion', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Scheduled Delete',
        status: 'scheduled' as CampaignStatus,
      });

      const deleted = await campaignService.deleteCampaign(campaign.id);
      expect(deleted).toBe(true);
    });
  });

  describe('Campaign Scheduling', () => {
    let testCampaign: EmailCampaign;

    beforeEach(async () => {
      testCampaign = await campaignService.createCampaign({
        name: 'Schedule Test',
      });
    });

    test('should schedule one-time campaign', async () => {
      const schedule: CampaignSchedule = {
        startDate: new Date(Date.now() + 3600000), // 1 hour from now
        timezone: 'UTC',
      };

      await campaignService.scheduleCampaign(testCampaign.id, schedule);

      const updated = await campaignService.getCampaign(testCampaign.id);
      expect(updated?.status).toBe('scheduled');
      expect(updated?.schedule).toMatchObject(schedule);
    });

    test('should schedule recurring campaign', async () => {
      const schedule: CampaignSchedule = {
        startDate: new Date(),
        timezone: 'UTC',
        frequency: {
          type: 'daily',
          interval: 1,
        },
      };

      await campaignService.scheduleCampaign(testCampaign.id, schedule);

      const updated = await campaignService.getCampaign(testCampaign.id);
      expect(updated?.schedule.frequency?.type).toBe('daily');
    });

    test('should handle weekly frequency', async () => {
      const schedule: CampaignSchedule = {
        startDate: new Date(),
        timezone: 'America/New_York',
        sendTime: '09:00',
        frequency: {
          type: 'weekly',
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        },
      };

      await campaignService.scheduleCampaign(testCampaign.id, schedule);

      const updated = await campaignService.getCampaign(testCampaign.id);
      expect(updated?.schedule.frequency?.daysOfWeek).toEqual([1, 3, 5]);
    });

    test('should throw error for non-existent campaign', async () => {
      await expect(
        campaignService.scheduleCampaign('non-existent', {
          startDate: new Date(),
          timezone: 'UTC',
        })
      ).rejects.toThrow('Campaign non-existent not found');
    });

    test('should execute immediately if start date is in past', async () => {
      const schedule: CampaignSchedule = {
        startDate: new Date(Date.now() - 3600000), // 1 hour ago
        timezone: 'UTC',
      };

      await campaignService.scheduleCampaign(testCampaign.id, schedule);

      const updated = await campaignService.getCampaign(testCampaign.id);
      expect(updated?.status).toBe('scheduled');
    });
  });

  describe('Campaign Status Management', () => {
    test('should pause active campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Pause Test',
        status: 'active' as CampaignStatus,
      });

      await campaignService.pauseCampaign(campaign.id);

      const updated = await campaignService.getCampaign(campaign.id);
      expect(updated?.status).toBe('paused');
    });

    test('should resume paused campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Resume Test',
        status: 'paused' as CampaignStatus,
      });

      await campaignService.resumeCampaign(campaign.id);

      const updated = await campaignService.getCampaign(campaign.id);
      expect(updated?.status).toBe('active');
    });

    test('should throw error resuming non-paused campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Active Campaign',
        status: 'active' as CampaignStatus,
      });

      await expect(
        campaignService.resumeCampaign(campaign.id)
      ).rejects.toThrow('Campaign is not paused');
    });

    test('should throw error for non-existent campaign pause', async () => {
      await expect(
        campaignService.pauseCampaign('non-existent')
      ).rejects.toThrow('Campaign non-existent not found');
    });
  });

  describe('Draft Management', () => {
    test('should create draft with default values', async () => {
      const draft = await campaignService.createDraft({
        content: {
          subject: 'Draft Subject',
          body: 'Draft Body',
        },
      });

      expect(draft.id).toBeDefined();
      expect(draft.status).toBe('draft');
      expect(draft.content.subject).toBe('Draft Subject');
    });

    test('should create draft with campaign ID', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Draft Campaign',
      });

      const draft = await campaignService.createDraft({
        campaignId: campaign.id,
        content: {
          subject: 'Test',
          body: 'Body',
        },
      });

      expect(draft.campaignId).toBe(campaign.id);
    });

    test('should approve draft', async () => {
      const draft = await campaignService.createDraft({
        content: {
          subject: 'Approval Test',
          body: 'Body',
        },
      });

      await campaignService.approveDraft(draft.id, 'approver@example.com');

      expect(draft.status).toBe('approved');
    });

    test('should reject draft with reason', async () => {
      const draft = await campaignService.createDraft({
        content: {
          subject: 'Rejection Test',
          body: 'Body',
        },
      });

      await campaignService.rejectDraft(draft.id, 'Content inappropriate');

      expect(draft.status).toBe('rejected');
    });

    test('should throw error for non-existent draft approval', async () => {
      await expect(
        campaignService.approveDraft('non-existent', 'approver')
      ).rejects.toThrow('Draft non-existent not found');
    });

    test('should update campaign approval status when approving draft', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Approval Campaign',
      });

      const draft = await campaignService.createDraft({
        campaignId: campaign.id,
        content: {
          subject: 'Test',
          body: 'Body',
        },
      });

      await campaignService.approveDraft(draft.id, 'approver@example.com');

      const updated = await campaignService.getCampaign(campaign.id);
      expect(updated?.approvalStatus?.approved).toBe(true);
      expect(updated?.approvalStatus?.approvedBy).toBe('approver@example.com');
    });
  });

  describe('Bulk Draft Generation', () => {
    test('should generate multiple drafts', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Bulk Draft Test',
      });

      const drafts = await campaignService.generateDrafts(campaign.id, 5);

      expect(drafts).toHaveLength(5);
      expect(drafts[0].campaignId).toBe(campaign.id);
    });

    test('should throw error for non-existent campaign', async () => {
      await expect(
        campaignService.generateDrafts('non-existent', 5)
      ).rejects.toThrow('Campaign non-existent not found');
    });

    test('should store generated drafts', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Store Draft Test',
      });

      const drafts = await campaignService.generateDrafts(campaign.id, 3);

      // Verify drafts are stored
      expect(drafts[0].id).toBeDefined();
      expect(drafts[1].id).toBeDefined();
      expect(drafts[2].id).toBeDefined();
    });
  });

  describe('Draft Optimization', () => {
    test('should optimize existing draft', async () => {
      const draft = await campaignService.createDraft({
        content: {
          subject: 'Optimize Me',
          body: 'Original content',
        },
      });

      const originalUpdate = draft.updatedAt;
      
      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const optimized = await campaignService.optimizeDraft(draft.id);

      expect(optimized.id).toBe(draft.id);
      expect(optimized.updatedAt.getTime()).toBeGreaterThan(originalUpdate.getTime());
    });

    test('should throw error for non-existent draft', async () => {
      await expect(
        campaignService.optimizeDraft('non-existent')
      ).rejects.toThrow('Draft non-existent not found');
    });

    test('should update metrics after optimization', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Metrics Campaign',
      });

      const draft = await campaignService.createDraft({
        campaignId: campaign.id,
        content: {
          subject: 'Test',
          body: 'Body',
        },
      });

      const optimized = await campaignService.optimizeDraft(draft.id);

      expect(optimized.metrics).toBeDefined();
      expect(optimized.aiScore).toBeDefined();
    });
  });

  describe('Campaign Metrics', () => {
    test('should retrieve campaign metrics', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Metrics Test',
      });

      const metrics = await campaignService.getMetrics(campaign.id);

      expect(metrics).toBeDefined();
      expect(metrics.sent).toBeDefined();
      expect(metrics.delivered).toBeDefined();
      expect(metrics.opened).toBeDefined();
      expect(metrics.clicked).toBeDefined();
    });

    test('should throw error for non-existent campaign', async () => {
      await expect(
        campaignService.getMetrics('non-existent')
      ).rejects.toThrow('Campaign non-existent not found');
    });

    test('should include timing metrics', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Timing Test',
      });

      const metrics = await campaignService.getMetrics(campaign.id);

      expect(metrics.timing).toBeDefined();
      expect(metrics.timing.avgTimeToOpen).toBeDefined();
      expect(metrics.timing.bestSendTime).toBeDefined();
    });

    test('should include geographic metrics', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Geo Test',
      });

      const metrics = await campaignService.getMetrics(campaign.id);

      expect(metrics.geographic).toBeDefined();
      expect(metrics.geographic.byCountry).toBeDefined();
      expect(metrics.geographic.byRegion).toBeDefined();
    });

    test('should include device metrics', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Device Test',
      });

      const metrics = await campaignService.getMetrics(campaign.id);

      expect(metrics.devices).toBeDefined();
      expect(metrics.devices.desktop).toBeDefined();
      expect(metrics.devices.mobile).toBeDefined();
      expect(metrics.devices.tablet).toBeDefined();
    });
  });

  describe('Campaign Export', () => {
    let testCampaign: EmailCampaign;

    beforeEach(async () => {
      testCampaign = await campaignService.createCampaign({
        name: 'Export Test',
        description: 'Test campaign for export',
      });
    });

    test('should export campaign as JSON', async () => {
      const buffer = await campaignService.exportCampaign(testCampaign.id, 'json');
      const exported = JSON.parse(buffer.toString());

      expect(exported.id).toBe(testCampaign.id);
      expect(exported.name).toBe('Export Test');
    });

    test('should export campaign as CSV', async () => {
      const buffer = await campaignService.exportCampaign(testCampaign.id, 'csv');
      const csv = buffer.toString();

      expect(csv).toContain('Field,Value');
      expect(csv).toContain('Export Test');
      expect(csv).toContain(testCampaign.id);
    });

    test('should export campaign as PDF', async () => {
      const buffer = await campaignService.exportCampaign(testCampaign.id, 'pdf');
      const pdf = buffer.toString();

      expect(pdf).toContain('Campaign Report');
      expect(pdf).toContain('Export Test');
      expect(pdf).toContain(testCampaign.id);
    });

    test('should throw error for non-existent campaign', async () => {
      await expect(
        campaignService.exportCampaign('non-existent', 'json')
      ).rejects.toThrow('Campaign non-existent not found');
    });

    test('should throw error for unsupported format', async () => {
      await expect(
        campaignService.exportCampaign(testCampaign.id, 'xml' as any)
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });
});