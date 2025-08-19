import { LinkedInService } from '../integrations/linkedin.service';
import { NewsService } from '../integrations/news.service';
import { PlatformComparisonService } from '../services/platform-comparison.service';

describe('LinkedIn Integration', () => {
  let linkedInService: LinkedInService;

  beforeEach(() => {
    linkedInService = new LinkedInService();
  });

  describe('Profile Fetching', () => {
    test('should fetch LinkedIn profile', async () => {
      const profile = await linkedInService.fetchProfile('https://linkedin.com/in/johndoe');

      expect(profile).toBeDefined();
      expect(profile.url).toBe('https://linkedin.com/in/johndoe');
      expect(profile.name).toBeDefined();
      expect(profile.headline).toBeDefined();
    });

    test('should cache fetched profiles', async () => {
      const url = 'https://linkedin.com/in/cached';
      
      const profile1 = await linkedInService.fetchProfile(url);
      const profile2 = await linkedInService.fetchProfile(url);

      expect(profile1).toEqual(profile2);
    });

    test('should include experience data', async () => {
      const profile = await linkedInService.fetchProfile('https://linkedin.com/in/test');

      expect(profile.experience).toBeDefined();
      expect(Array.isArray(profile.experience)).toBe(true);
      if (profile.experience && profile.experience.length > 0) {
        expect(profile.experience[0].title).toBeDefined();
        expect(profile.experience[0].company).toBeDefined();
      }
    });

    test('should include education data', async () => {
      const profile = await linkedInService.fetchProfile('https://linkedin.com/in/test');

      expect(profile.education).toBeDefined();
      expect(Array.isArray(profile.education)).toBe(true);
    });

    test('should include skills', async () => {
      const profile = await linkedInService.fetchProfile('https://linkedin.com/in/test');

      expect(profile.skills).toBeDefined();
      expect(Array.isArray(profile.skills)).toBe(true);
    });
  });

  describe('Company Data', () => {
    test('should fetch company information', async () => {
      const company = await linkedInService.fetchCompany('https://linkedin.com/company/techcorp');

      expect(company).toBeDefined();
      expect(company.name).toBeDefined();
      expect(company.industry).toBeDefined();
      expect(company.size).toBeDefined();
    });

    test('should include company updates', async () => {
      const company = await linkedInService.fetchCompany('https://linkedin.com/company/test');

      expect(company.updates).toBeDefined();
      expect(Array.isArray(company.updates)).toBe(true);
    });
  });

  describe('Post Search', () => {
    test('should search for posts', async () => {
      const posts = await linkedInService.searchPosts('technology');

      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
    });

    test('should include post engagement metrics', async () => {
      const posts = await linkedInService.searchPosts('innovation');

      if (posts.length > 0) {
        expect(posts[0].likes).toBeDefined();
        expect(posts[0].comments).toBeDefined();
        expect(posts[0].shares).toBeDefined();
      }
    });

    test('should apply filters to search', async () => {
      const posts = await linkedInService.searchPosts('test', { author: 'specific' });

      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
    });
  });

  describe('Data Extraction', () => {
    test('should extract data with rules', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [
        { field: 'name', selector: '', pattern: '', transform: '' },
        { field: 'company', selector: '', pattern: '', transform: '' },
      ];

      const extracted = await linkedInService.extractData(source, rules);

      expect(extracted).toBeDefined();
      expect(extracted.name).toBeDefined();
    });

    test('should apply transformations', async () => {
      const source = { type: 'profile' as const, url: 'https://linkedin.com/in/test' };
      const rules = [
        { field: 'name', selector: '', pattern: '', transform: 'uppercase' },
      ];

      const extracted = await linkedInService.extractData(source, rules);

      expect(extracted.name).toBe(extracted.name.toUpperCase());
    });
  });

  describe('Insights Generation', () => {
    test('should generate profile insights', async () => {
      const profile = await linkedInService.fetchProfile('https://linkedin.com/in/test');
      const insights = await linkedInService.generateInsights(profile);

      expect(insights).toBeDefined();
      expect(typeof insights).toBe('string');
      expect(insights.length).toBeGreaterThan(0);
    });

    test('should include current role in insights', async () => {
      const profile = await linkedInService.fetchProfile('https://linkedin.com/in/test');
      const insights = await linkedInService.generateInsights(profile);

      expect(insights).toContain('Current role');
    });

    test('should handle profiles without activity', async () => {
      const profile = {
        url: 'https://linkedin.com/in/minimal',
        name: 'Minimal Profile',
      };

      const insights = await linkedInService.generateInsights(profile);

      expect(insights).toBeDefined();
    });
  });

  describe('Engagement Trends', () => {
    test('should analyze engagement trends', async () => {
      const trends = await linkedInService.getEngagementTrends('profile-id', 30);

      expect(trends).toBeDefined();
      expect(trends.averageLikes).toBeDefined();
      expect(trends.averageComments).toBeDefined();
      expect(trends.bestPostingTime).toBeDefined();
    });

    test('should identify top hashtags', async () => {
      const trends = await linkedInService.getEngagementTrends('profile-id', 30);

      expect(trends.topHashtags).toBeDefined();
      expect(Array.isArray(trends.topHashtags)).toBe(true);
    });
  });

  describe('Connection Validation', () => {
    test('should validate LinkedIn connection', async () => {
      const isValid = await linkedInService.validateConnection();

      expect(typeof isValid).toBe('boolean');
    });
  });
});

describe('News Service Integration', () => {
  let newsService: NewsService;

  beforeEach(() => {
    newsService = new NewsService();
  });

  describe('Article Fetching', () => {
    test('should fetch news articles', async () => {
      const articles = await newsService.fetchArticles();

      expect(articles).toBeDefined();
      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBeGreaterThan(0);
    });

    test('should fetch from multiple sources', async () => {
      const articles = await newsService.fetchArticles();
      const sources = new Set(articles.map(a => a.source));

      expect(sources.size).toBeGreaterThan(1);
    });

    test('should filter by topics', async () => {
      const articles = await newsService.fetchArticles(undefined, ['technology']);

      expect(articles).toBeDefined();
      expect(articles.length).toBeGreaterThan(0);
    });

    test('should sort by relevance and date', async () => {
      const articles = await newsService.fetchArticles();

      if (articles.length > 1) {
        const scores = articles.map(a => a.relevanceScore || 0);
        expect(scores[0]).toBeGreaterThanOrEqual(scores[scores.length - 1]);
      }
    });
  });

  describe('Article Analysis', () => {
    test('should analyze articles', async () => {
      const articles = await newsService.fetchArticles();
      const analysis = await newsService.analyzeArticles(articles);

      expect(analysis).toBeDefined();
      expect(analysis.topTopics).toBeDefined();
      expect(analysis.sentimentDistribution).toBeDefined();
    });

    test('should count sentiment distribution', async () => {
      const articles = await newsService.fetchArticles();
      const analysis = await newsService.analyzeArticles(articles);

      const total = analysis.sentimentDistribution.positive +
                   analysis.sentimentDistribution.negative +
                   analysis.sentimentDistribution.neutral;

      expect(total).toBe(articles.length);
    });

    test('should identify trending keywords', async () => {
      const articles = await newsService.fetchArticles();
      const analysis = await newsService.analyzeArticles(articles);

      expect(analysis.trendingKeywords).toBeDefined();
      expect(Array.isArray(analysis.trendingKeywords)).toBe(true);
    });

    test('should count by category', async () => {
      const articles = await newsService.fetchArticles();
      const analysis = await newsService.analyzeArticles(articles);

      expect(analysis.categoryCounts).toBeDefined();
      expect(typeof analysis.categoryCounts).toBe('object');
    });
  });

  describe('Article Summarization', () => {
    test('should summarize article', async () => {
      const article = {
        id: '1',
        title: 'Test Article',
        content: 'This is a long article content. It contains multiple sentences. Each sentence adds information. The content is comprehensive.',
        url: 'https://example.com/article',
        source: 'Test Source',
        publishedAt: new Date(),
      };

      const summary = await newsService.summarizeArticle(article, 100);

      expect(summary).toBeDefined();
      expect(summary.length).toBeLessThanOrEqual(100);
    });

    test('should use existing summary if available', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'Long content',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
        summary: 'Existing summary',
      };

      const summary = await newsService.summarizeArticle(article);

      expect(summary).toContain('Existing summary');
    });
  });

  describe('Digest Generation', () => {
    test('should generate news digest', async () => {
      const articles = await newsService.fetchArticles();
      const digest = await newsService.generateDigest(articles, 3);

      expect(digest).toBeDefined();
      expect(digest).toContain('News Digest');
      expect(digest).toContain('Trending Topics');
    });

    test('should limit articles in digest', async () => {
      const articles = await newsService.fetchArticles();
      const digest = await newsService.generateDigest(articles, 2);

      const articleCount = (digest.match(/🔹/g) || []).length;
      expect(articleCount).toBe(2);
    });
  });

  describe('Article Search', () => {
    test('should search articles by query', async () => {
      const results = await newsService.searchArticles('technology');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test('should filter by date range', async () => {
      const dateFrom = new Date(Date.now() - 7 * 86400000);
      const results = await newsService.searchArticles('test', { dateFrom });

      results.forEach(article => {
        expect(article.publishedAt >= dateFrom).toBe(true);
      });
    });

    test('should limit search results', async () => {
      const results = await newsService.searchArticles('news', { limit: 5 });

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Relevance Calculation', () => {
    test('should calculate article relevance', async () => {
      const article = {
        id: '1',
        title: 'Technology Innovation',
        description: 'About technology and innovation',
        content: 'Technology is advancing rapidly',
        url: 'https://example.com',
        source: 'Tech News',
        publishedAt: new Date(),
        tags: ['tech', 'innovation'],
      };

      const relevance = await newsService.calculateRelevance(article, ['technology', 'innovation']);

      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBeLessThanOrEqual(1);
    });

    test('should return default relevance for no interests', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'Content',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
      };

      const relevance = await newsService.calculateRelevance(article, []);

      expect(relevance).toBe(0.5);
    });
  });

  describe('Source Management', () => {
    test('should get all sources', () => {
      const sources = newsService.getSources();

      expect(sources).toBeDefined();
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThan(0);
    });

    test('should add new source', () => {
      const newSource = {
        name: 'New Source',
        url: 'https://newsource.com',
        category: 'general',
        trustScore: 0.8,
      };

      newsService.addSource(newSource);
      const sources = newsService.getSources();

      expect(sources).toContainEqual(newSource);
    });

    test('should remove source', () => {
      const sourceName = 'TechCrunch';
      const removed = newsService.removeSource(sourceName);

      expect(removed).toBe(true);
      
      const sources = newsService.getSources();
      expect(sources.find(s => s.name === sourceName)).toBeUndefined();
    });

    test('should handle removing non-existent source', () => {
      const removed = newsService.removeSource('NonExistent');

      expect(removed).toBe(false);
    });
  });

  describe('Connection Validation', () => {
    test('should validate news service connection', async () => {
      const isValid = await newsService.validateConnection();

      expect(typeof isValid).toBe('boolean');
    });
  });
});

describe('Platform Comparison Service', () => {
  let comparisonService: PlatformComparisonService;

  beforeEach(() => {
    comparisonService = new PlatformComparisonService();
  });

  describe('Platform Comparison', () => {
    test('should compare platforms based on requirements', () => {
      const requirements = {
        maxSubscribers: 100000,
        emailsPerMonth: 1000000,
        needsAutomation: true,
        needsApi: true,
        qudagIntegration: true,
      };

      const platforms = comparisonService.comparePlatforms(requirements);

      expect(platforms).toBeDefined();
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms.length).toBeGreaterThan(0);
    });

    test('should score platforms correctly', () => {
      const requirements = {
        needsAutomation: true,
        qudagIntegration: true,
      };

      const platforms = comparisonService.comparePlatforms(requirements);

      platforms.forEach(platform => {
        expect(platform.score).toBeGreaterThanOrEqual(0);
        expect(platform.score).toBeLessThanOrEqual(100);
      });
    });

    test('should rank by score', () => {
      const platforms = comparisonService.comparePlatforms({});

      for (let i = 1; i < platforms.length; i++) {
        expect(platforms[i - 1].score).toBeGreaterThanOrEqual(platforms[i].score);
      }
    });

    test('should consider budget constraints', () => {
      const requirements = {
        budget: 0,
      };

      const platforms = comparisonService.comparePlatforms(requirements);
      const topPlatform = platforms[0];

      expect(topPlatform.pricing.type).toBe('free');
    });

    test('should match technical expertise', () => {
      const requirements = {
        technicalExpertise: 'low',
      };

      const platforms = comparisonService.comparePlatforms(requirements);

      expect(platforms).toBeDefined();
    });
  });

  describe('Recommendations', () => {
    test('should provide recommendation', () => {
      const requirements = {
        emailsPerMonth: 1000000,
        needsAutomation: true,
        qudagIntegration: true,
      };

      const recommendation = comparisonService.getRecommendation(requirements);

      expect(recommendation.primary).toBeDefined();
      expect(recommendation.alternatives).toBeDefined();
      expect(recommendation.recommendation).toBeDefined();
    });

    test('should include implementation approach', () => {
      const requirements = {
        needsAutomation: true,
      };

      const recommendation = comparisonService.getRecommendation(requirements);

      expect(recommendation.recommendation).toContain('Implementation approach');
    });

    test('should suggest alternatives', () => {
      const recommendation = comparisonService.getRecommendation({});

      expect(recommendation.alternatives).toBeDefined();
      expect(recommendation.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('Comparison Matrix', () => {
    test('should generate comparison matrix', () => {
      const matrix = comparisonService.generateComparisonMatrix();

      expect(matrix).toBeDefined();
      expect(matrix).toContain('Platform');
      expect(matrix).toContain('Segmentation');
      expect(matrix).toContain('Automation');
      expect(matrix).toContain('Qudag Compatible');
    });

    test('should include all platforms in matrix', () => {
      const matrix = comparisonService.generateComparisonMatrix();

      expect(matrix).toContain('Mautic');
      expect(matrix).toContain('Mailtrain');
      expect(matrix).toContain('Listmonk');
      expect(matrix).toContain('Sympa');
      expect(matrix).toContain('Postfix');
    });

    test('should show feature support', () => {
      const matrix = comparisonService.generateComparisonMatrix();

      expect(matrix).toContain('✓');
      expect(matrix).toContain('✗');
    });
  });
});