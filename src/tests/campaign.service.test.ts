import { CampaignService } from '../services/campaign.service';
import { DatabaseService } from '../services/database.service';
import { CampaignStatus } from '../core/campaign.interfaces';

describe('CampaignService', () => {
  let campaignService: CampaignService;
  let mockDatabase: DatabaseService;

  beforeEach(() => {
    mockDatabase = new DatabaseService();
    campaignService = new CampaignService(mockDatabase);
  });

  describe('Campaign Management', () => {
    test('should create a new campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Test Campaign',
        description: 'Test description',
      });

      expect(campaign).toBeDefined();
      expect(campaign.id).toBeDefined();
      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.status).toBe('draft');
    });

    test('should update an existing campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Original Name',
      });

      const updated = await campaignService.updateCampaign(campaign.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.updatedAt).not.toBe(campaign.updatedAt);
    });

    test('should retrieve a campaign by ID', async () => {
      const created = await campaignService.createCampaign({
        name: 'Test Campaign',
      });

      const retrieved = await campaignService.getCampaign(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    test('should list campaigns with filters', async () => {
      await campaignService.createCampaign({ name: 'Active Campaign', status: 'active' as CampaignStatus });
      await campaignService.createCampaign({ name: 'Draft Campaign', status: 'draft' as CampaignStatus });

      const activeCampaigns = await campaignService.listCampaigns({
        status: ['active'],
      });

      expect(activeCampaigns).toHaveLength(1);
      expect(activeCampaigns[0].name).toBe('Active Campaign');
    });

    test('should delete a campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'To Delete',
      });

      const deleted = await campaignService.deleteCampaign(campaign.id);
      expect(deleted).toBe(true);

      const retrieved = await campaignService.getCampaign(campaign.id);
      expect(retrieved).toBeNull();
    });

    test('should handle non-existent campaign deletion', async () => {
      const deleted = await campaignService.deleteCampaign('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Campaign Scheduling', () => {
    test('should schedule a one-time campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Scheduled Campaign',
      });

      await campaignService.scheduleCampaign(campaign.id, {
        startDate: new Date(Date.now() + 86400000),
        timezone: 'UTC',
      });

      const updated = await campaignService.getCampaign(campaign.id);
      expect(updated?.status).toBe('scheduled');
    });

    test('should pause an active campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Active Campaign',
        status: 'active' as CampaignStatus,
      });

      await campaignService.pauseCampaign(campaign.id);
      const updated = await campaignService.getCampaign(campaign.id);
      expect(updated?.status).toBe('paused');
    });

    test('should resume a paused campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Paused Campaign',
        status: 'paused' as CampaignStatus,
      });

      await campaignService.resumeCampaign(campaign.id);
      const updated = await campaignService.getCampaign(campaign.id);
      expect(updated?.status).toBe('active');
    });

    test('should reject resuming non-paused campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Active Campaign',
        status: 'active' as CampaignStatus,
      });

      await expect(campaignService.resumeCampaign(campaign.id))
        .rejects.toThrow('Campaign is not paused');
    });
  });

  describe('Draft Management', () => {
    test('should create a new draft', async () => {
      const draft = await campaignService.createDraft({
        content: {
          subject: 'Test Subject',
          body: 'Test Body',
        },
      });

      expect(draft).toBeDefined();
      expect(draft.id).toBeDefined();
      expect(draft.status).toBe('draft');
    });

    test('should approve a draft', async () => {
      const draft = await campaignService.createDraft({
        content: {
          subject: 'Test',
          body: 'Body',
        },
      });

      await campaignService.approveDraft(draft.id, 'approver@example.com');
      expect(draft.status).toBe('approved');
    });

    test('should reject a draft with reason', async () => {
      const draft = await campaignService.createDraft({
        content: {
          subject: 'Test',
          body: 'Body',
        },
      });

      await campaignService.rejectDraft(draft.id, 'Content not appropriate');
      expect(draft.status).toBe('rejected');
    });

    test('should generate multiple drafts for campaign', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Draft Campaign',
      });

      const drafts = await campaignService.generateDrafts(campaign.id, 5);
      expect(drafts).toHaveLength(5);
      expect(drafts[0].campaignId).toBe(campaign.id);
    });

    test('should optimize an existing draft', async () => {
      const draft = await campaignService.createDraft({
        content: {
          subject: 'Original Subject',
          body: 'Original Body',
        },
      });

      const optimized = await campaignService.optimizeDraft(draft.id);
      expect(optimized.id).toBe(draft.id);
      expect(optimized.updatedAt).not.toBe(draft.createdAt);
    });
  });

  describe('Metrics and Export', () => {
    test('should retrieve campaign metrics', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Metrics Campaign',
      });

      const metrics = await campaignService.getMetrics(campaign.id);
      expect(metrics).toBeDefined();
      expect(metrics.sent).toBeDefined();
      expect(metrics.delivered).toBeDefined();
      expect(metrics.opened).toBeDefined();
    });

    test('should export campaign as JSON', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'Export Campaign',
      });

      const buffer = await campaignService.exportCampaign(campaign.id, 'json');
      const exported = JSON.parse(buffer.toString());
      expect(exported.name).toBe('Export Campaign');
    });

    test('should export campaign as CSV', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'CSV Campaign',
      });

      const buffer = await campaignService.exportCampaign(campaign.id, 'csv');
      const csv = buffer.toString();
      expect(csv).toContain('CSV Campaign');
      expect(csv).toContain('Field,Value');
    });

    test('should export campaign as PDF', async () => {
      const campaign = await campaignService.createCampaign({
        name: 'PDF Campaign',
      });

      const buffer = await campaignService.exportCampaign(campaign.id, 'pdf');
      const pdf = buffer.toString();
      expect(pdf).toContain('Campaign Report');
      expect(pdf).toContain('PDF Campaign');
    });
  });

  describe('Campaign Filtering', () => {
    beforeEach(async () => {
      await campaignService.createCampaign({ 
        name: 'Campaign 1', 
        status: 'active' as CampaignStatus,
        createdBy: 'user1',
      });
      await campaignService.createCampaign({ 
        name: 'Campaign 2', 
        status: 'draft' as CampaignStatus,
        createdBy: 'user2',
      });
      await campaignService.createCampaign({ 
        name: 'Campaign 3', 
        status: 'completed' as CampaignStatus,
        createdBy: 'user1',
      });
    });

    test('should filter campaigns by status', async () => {
      const active = await campaignService.listCampaigns({
        status: ['active'],
      });
      expect(active).toHaveLength(1);
    });

    test('should filter campaigns by creator', async () => {
      const user1Campaigns = await campaignService.listCampaigns({
        createdBy: 'user1',
      });
      expect(user1Campaigns).toHaveLength(2);
    });

    test('should sort campaigns by name', async () => {
      const sorted = await campaignService.listCampaigns({
        sortBy: 'name',
        sortOrder: 'asc',
      });
      expect(sorted[0].name).toBe('Campaign 1');
      expect(sorted[2].name).toBe('Campaign 3');
    });

    test('should paginate campaign results', async () => {
      const page1 = await campaignService.listCampaigns({
        limit: 2,
        offset: 0,
      });
      expect(page1).toHaveLength(2);

      const page2 = await campaignService.listCampaigns({
        limit: 2,
        offset: 2,
      });
      expect(page2).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle campaign not found on update', async () => {
      await expect(campaignService.updateCampaign('non-existent', { name: 'New' }))
        .rejects.toThrow('Campaign non-existent not found');
    });

    test('should handle campaign not found on schedule', async () => {
      await expect(campaignService.scheduleCampaign('non-existent', {
        startDate: new Date(),
        timezone: 'UTC',
      })).rejects.toThrow('Campaign non-existent not found');
    });

    test('should handle draft not found on approval', async () => {
      await expect(campaignService.approveDraft('non-existent', 'approver'))
        .rejects.toThrow('Draft non-existent not found');
    });

    test('should handle draft not found on rejection', async () => {
      await expect(campaignService.rejectDraft('non-existent', 'reason'))
        .rejects.toThrow('Draft non-existent not found');
    });

    test('should handle campaign not found on metrics', async () => {
      await expect(campaignService.getMetrics('non-existent'))
        .rejects.toThrow('Campaign non-existent not found');
    });
  });
});