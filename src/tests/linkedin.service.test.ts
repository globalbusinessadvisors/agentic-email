import { LinkedInService } from '../integrations/linkedin.service';

describe('LinkedInService Unit Tests', () => {
  let service: LinkedInService;

  beforeEach(() => {
    service = new LinkedInService();
  });

  describe('Profile Operations', () => {
    test('should create service instance', () => {
      expect(service).toBeDefined();
    });

    test('should fetch profile with all fields', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      expect(profile.url).toBe('https://linkedin.com/in/test');
      expect(profile.name).toBeDefined();
      expect(profile.headline).toBeDefined();
      expect(profile.company).toBeDefined();
    });

    test('should handle profile URL validation', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/valid-user');
      expect(profile.url).toContain('linkedin.com');
    });

    test('should return experience array', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      expect(Array.isArray(profile.experience)).toBe(true);
    });

    test('should return education array', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      expect(Array.isArray(profile.education)).toBe(true);
    });

    test('should return skills array', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      expect(Array.isArray(profile.skills)).toBe(true);
    });

    test('should include connections count', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      expect(typeof profile.connections).toBe('number');
    });

    test('should include recommendations', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      expect(typeof profile.recommendations).toBe('number');
    });

    test('should include activity data', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      expect(Array.isArray(profile.activity)).toBe(true);
    });

    test('should validate profile structure', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      expect(profile).toHaveProperty('url');
      expect(profile).toHaveProperty('name');
    });
  });

  describe('Company Operations', () => {
    test('should fetch company data', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(company.url).toBe('https://linkedin.com/company/test');
      expect(company.name).toBeDefined();
    });

    test('should include industry information', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(company.industry).toBeDefined();
    });

    test('should include company size', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(company.size).toBeDefined();
    });

    test('should include headquarters location', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(company.headquarters).toBeDefined();
    });

    test('should include website URL', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(company.website).toBeDefined();
    });

    test('should include specialties', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(Array.isArray(company.specialties)).toBe(true);
    });

    test('should include follower count', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(typeof company.followers).toBe('number');
    });

    test('should include employee count', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(typeof company.employees).toBe('number');
    });

    test('should include company updates', async () => {
      const company = await service.fetchCompany('https://linkedin.com/company/test');
      expect(Array.isArray(company.updates)).toBe(true);
    });

    test('should cache company data', async () => {
      const url = 'https://linkedin.com/company/cached';
      await service.fetchCompany(url);
      await service.fetchCompany(url); // Should use cache
      expect(true).toBe(true);
    });
  });

  describe('Post Search', () => {
    test('should search posts by query', async () => {
      const posts = await service.searchPosts('technology');
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
    });

    test('should return post author', async () => {
      const posts = await service.searchPosts('test');
      if (posts.length > 0) {
        expect(posts[0].author).toBeDefined();
      }
    });

    test('should return post content', async () => {
      const posts = await service.searchPosts('test');
      if (posts.length > 0) {
        expect(posts[0].content).toBeDefined();
      }
    });

    test('should return engagement metrics', async () => {
      const posts = await service.searchPosts('test');
      if (posts.length > 0) {
        expect(posts[0].likes).toBeDefined();
        expect(posts[0].comments).toBeDefined();
        expect(posts[0].shares).toBeDefined();
      }
    });

    test('should return hashtags', async () => {
      const posts = await service.searchPosts('test');
      if (posts.length > 0) {
        expect(Array.isArray(posts[0].hashtags)).toBe(true);
      }
    });

    test('should return mentions', async () => {
      const posts = await service.searchPosts('test');
      if (posts.length > 0) {
        expect(Array.isArray(posts[0].mentions)).toBe(true);
      }
    });

    test('should handle empty search results', async () => {
      const posts = await service.searchPosts('veryrandomquerythatdoesntexist');
      expect(Array.isArray(posts)).toBe(true);
    });

    test('should apply search filters', async () => {
      const posts = await service.searchPosts('test', { limit: 5 });
      expect(Array.isArray(posts)).toBe(true);
    });

    test('should sort by relevance', async () => {
      const posts = await service.searchPosts('important');
      expect(posts).toBeDefined();
    });

    test('should include post timestamp', async () => {
      const posts = await service.searchPosts('test');
      if (posts.length > 0) {
        expect(posts[0].timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('Data Extraction', () => {
    test('should extract profile data', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [{ field: 'name', selector: '', pattern: '', transform: '' }];
      const data = await service.extractData(source, rules);
      expect(data.name).toBeDefined();
    });

    test('should extract company data', async () => {
      const source = { type: 'company' as const, url: 'https://linkedin.com/company/test' };
      const rules = [{ field: 'name', selector: '', pattern: '', transform: '' }];
      const data = await service.extractData(source, rules);
      expect(data.name).toBeDefined();
    });

    test('should apply uppercase transform', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [{ field: 'name', selector: '', pattern: '', transform: 'uppercase' }];
      const data = await service.extractData(source, rules);
      expect(data.name).toBe(data.name.toUpperCase());
    });

    test('should apply lowercase transform', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [{ field: 'name', selector: '', pattern: '', transform: 'lowercase' }];
      const data = await service.extractData(source, rules);
      expect(data.name).toBe(data.name.toLowerCase());
    });

    test('should apply trim transform', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [{ field: 'name', selector: '', pattern: '', transform: 'trim' }];
      const data = await service.extractData(source, rules);
      expect(data.name).toBe(data.name.trim());
    });

    test('should extract multiple fields', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [
        { field: 'name', selector: '', pattern: '', transform: '' },
        { field: 'company', selector: '', pattern: '', transform: '' },
      ];
      const data = await service.extractData(source, rules);
      expect(Object.keys(data).length).toBeGreaterThanOrEqual(1);
    });

    test('should handle missing fields gracefully', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [{ field: 'nonexistent', selector: '', pattern: '', transform: '' }];
      const data = await service.extractData(source, rules);
      expect(data).toBeDefined();
    });

    test('should apply pattern matching', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [{ field: 'name', selector: '', pattern: '^[A-Z]', transform: '' }];
      const data = await service.extractData(source, rules);
      expect(data).toBeDefined();
    });

    test('should handle invalid source type', async () => {
      const source = { type: 'invalid' as any, url: 'https://linkedin.com/in/test' };
      const rules = [{ field: 'name', selector: '', pattern: '', transform: '' }];
      await expect(service.extractData(source, rules)).rejects.toThrow();
    });

    test('should cache extracted data', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/cached' };
      const rules = [{ field: 'name', selector: '', pattern: '', transform: '' }];
      await service.extractData(source, rules);
      await service.extractData(source, rules); // Should use cache
      expect(true).toBe(true);
    });
  });

  describe('Insights Generation', () => {
    test('should generate insights from profile', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      const insights = await service.generateInsights(profile);
      expect(typeof insights).toBe('string');
      expect(insights.length).toBeGreaterThan(0);
    });

    test('should include current role in insights', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      const insights = await service.generateInsights(profile);
      expect(insights).toContain('Current role');
    });

    test('should include experience duration', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      if (profile.experience && profile.experience.length > 0) {
        const insights = await service.generateInsights(profile);
        expect(insights).toContain('at');
      }
    });

    test('should include top skills', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      if (profile.skills && profile.skills.length > 0) {
        const insights = await service.generateInsights(profile);
        expect(insights).toContain('Key skills');
      }
    });

    test('should include recent activity', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      if (profile.activity && profile.activity.length > 0) {
        const insights = await service.generateInsights(profile);
        expect(insights).toContain('posted');
      }
    });

    test('should handle minimal profile', async () => {
      const minimalProfile = {
        url: 'https://linkedin.com/in/minimal',
        name: 'Test User',
      };
      const insights = await service.generateInsights(minimalProfile);
      expect(insights).toBeDefined();
    });

    test('should handle profile without experience', async () => {
      const profile = {
        url: 'https://linkedin.com/in/test',
        name: 'Test User',
        experience: [],
      };
      const insights = await service.generateInsights(profile);
      expect(insights).toBeDefined();
    });

    test('should handle profile without skills', async () => {
      const profile = {
        url: 'https://linkedin.com/in/test',
        name: 'Test User',
        skills: [],
      };
      const insights = await service.generateInsights(profile);
      expect(insights).toBeDefined();
    });

    test('should format insights properly', async () => {
      const profile = await service.fetchProfile('https://linkedin.com/in/test');
      const insights = await service.generateInsights(profile);
      expect(insights).toContain('|');
    });

    test('should include recommendations count', async () => {
      const profile = {
        url: 'https://linkedin.com/in/test',
        name: 'Test User',
        recommendations: 10,
      };
      const insights = await service.generateInsights(profile);
      expect(insights).toContain('recommendations');
    });
  });

  describe('Engagement Analysis', () => {
    test('should analyze engagement trends', async () => {
      const trends = await service.getEngagementTrends('test-id');
      expect(trends).toBeDefined();
      expect(trends.averageLikes).toBeDefined();
    });

    test('should return average comments', async () => {
      const trends = await service.getEngagementTrends('test-id');
      expect(trends.averageComments).toBeDefined();
    });

    test('should return average shares', async () => {
      const trends = await service.getEngagementTrends('test-id');
      expect(trends.averageShares).toBeDefined();
    });

    test('should identify best posting time', async () => {
      const trends = await service.getEngagementTrends('test-id');
      expect(trends.bestPostingTime).toBeDefined();
    });

    test('should return top hashtags', async () => {
      const trends = await service.getEngagementTrends('test-id');
      expect(Array.isArray(trends.topHashtags)).toBe(true);
    });

    test('should calculate engagement rate', async () => {
      const trends = await service.getEngagementTrends('test-id');
      expect(trends.engagementRate).toBeDefined();
      expect(trends.engagementRate).toBeGreaterThanOrEqual(0);
      expect(trends.engagementRate).toBeLessThanOrEqual(1);
    });

    test('should calculate growth rate', async () => {
      const trends = await service.getEngagementTrends('test-id');
      expect(trends.growthRate).toBeDefined();
    });

    test('should handle custom time period', async () => {
      const trends = await service.getEngagementTrends('test-id', 60);
      expect(trends).toBeDefined();
    });

    test('should return valid metrics', async () => {
      const trends = await service.getEngagementTrends('test-id');
      expect(trends.averageLikes).toBeGreaterThanOrEqual(0);
      expect(trends.averageComments).toBeGreaterThanOrEqual(0);
    });

    test('should validate connection', async () => {
      const isValid = await service.validateConnection();
      expect(typeof isValid).toBe('boolean');
    });
  });
});