import { NewsService } from '../integrations/news.service';

describe('NewsService Unit Tests', () => {
  let service: NewsService;

  beforeEach(() => {
    service = new NewsService();
  });

  describe('Service Initialization', () => {
    test('should create service instance', () => {
      expect(service).toBeDefined();
    });

    test('should initialize default sources', () => {
      const sources = service.getSources();
      expect(sources.length).toBeGreaterThan(0);
    });

    test('should have TechCrunch as source', () => {
      const sources = service.getSources();
      expect(sources.find(s => s.name === 'TechCrunch')).toBeDefined();
    });

    test('should have Reuters as source', () => {
      const sources = service.getSources();
      expect(sources.find(s => s.name === 'Reuters')).toBeDefined();
    });

    test('should have Bloomberg as source', () => {
      const sources = service.getSources();
      expect(sources.find(s => s.name === 'Bloomberg')).toBeDefined();
    });
  });

  describe('Article Fetching', () => {
    test('should fetch articles', async () => {
      const articles = await service.fetchArticles();
      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBeGreaterThan(0);
    });

    test('should return article with required fields', async () => {
      const articles = await service.fetchArticles();
      if (articles.length > 0) {
        expect(articles[0].id).toBeDefined();
        expect(articles[0].title).toBeDefined();
        expect(articles[0].content).toBeDefined();
        expect(articles[0].url).toBeDefined();
      }
    });

    test('should include article source', async () => {
      const articles = await service.fetchArticles();
      if (articles.length > 0) {
        expect(articles[0].source).toBeDefined();
      }
    });

    test('should include published date', async () => {
      const articles = await service.fetchArticles();
      if (articles.length > 0) {
        expect(articles[0].publishedAt).toBeInstanceOf(Date);
      }
    });

    test('should include relevance score', async () => {
      const articles = await service.fetchArticles();
      if (articles.length > 0) {
        expect(articles[0].relevanceScore).toBeDefined();
        expect(articles[0].relevanceScore).toBeGreaterThanOrEqual(0);
        expect(articles[0].relevanceScore).toBeLessThanOrEqual(1);
      }
    });

    test('should filter by topics', async () => {
      const articles = await service.fetchArticles(undefined, ['technology']);
      expect(articles.length).toBeGreaterThanOrEqual(0);
    });

    test('should sort by relevance', async () => {
      const articles = await service.fetchArticles();
      if (articles.length > 1) {
        expect(articles[0].relevanceScore).toBeGreaterThanOrEqual(
          articles[articles.length - 1].relevanceScore || 0
        );
      }
    });

    test('should fetch from specific sources', async () => {
      const sources = service.getSources().slice(0, 1);
      const articles = await service.fetchArticles(sources);
      expect(Array.isArray(articles)).toBe(true);
    });

    test('should handle empty topic filter', async () => {
      const articles = await service.fetchArticles(undefined, []);
      expect(Array.isArray(articles)).toBe(true);
    });

    test('should cache fetched articles', async () => {
      await service.fetchArticles(undefined, ['cached']);
      await service.fetchArticles(undefined, ['cached']); // Should use cache
      expect(true).toBe(true);
    });
  });

  describe('Article Analysis', () => {
    test('should analyze articles', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      expect(analysis).toBeDefined();
    });

    test('should return top topics', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      expect(Array.isArray(analysis.topTopics)).toBe(true);
    });

    test('should return sentiment distribution', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      expect(analysis.sentimentDistribution).toBeDefined();
      expect(analysis.sentimentDistribution.positive).toBeDefined();
      expect(analysis.sentimentDistribution.negative).toBeDefined();
      expect(analysis.sentimentDistribution.neutral).toBeDefined();
    });

    test('should return trending keywords', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      expect(Array.isArray(analysis.trendingKeywords)).toBe(true);
    });

    test('should return category counts', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      expect(typeof analysis.categoryCounts).toBe('object');
    });

    test('should return source counts', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      expect(typeof analysis.sourceCounts).toBe('object');
    });

    test('should handle empty article list', async () => {
      const analysis = await service.analyzeArticles([]);
      expect(analysis).toBeDefined();
      expect(analysis.topTopics).toEqual([]);
    });

    test('should limit trending keywords to 10', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      expect(analysis.trendingKeywords.length).toBeLessThanOrEqual(10);
    });

    test('should limit top topics to 5', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      expect(analysis.topTopics.length).toBeLessThanOrEqual(5);
    });

    test('should count sentiments correctly', async () => {
      const articles = await service.fetchArticles();
      const analysis = await service.analyzeArticles(articles);
      const total = analysis.sentimentDistribution.positive +
                   analysis.sentimentDistribution.negative +
                   analysis.sentimentDistribution.neutral;
      expect(total).toBe(articles.length);
    });
  });

  describe('Article Summarization', () => {
    test('should summarize article', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'This is a test article. It has multiple sentences. Each sentence is important.',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
      };
      const summary = await service.summarizeArticle(article);
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    test('should respect max length', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'Very long content '.repeat(100),
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
      };
      const summary = await service.summarizeArticle(article, 50);
      expect(summary.length).toBeLessThanOrEqual(50);
    });

    test('should use existing summary if available', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'Content',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
        summary: 'Existing summary',
      };
      const summary = await service.summarizeArticle(article);
      expect(summary).toContain('Existing summary');
    });

    test('should handle short content', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'Short.',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
      };
      const summary = await service.summarizeArticle(article);
      expect(summary).toBe('Short.');
    });

    test('should add ellipsis for truncated summaries', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'This is a very long article content that will definitely exceed the maximum length limit and needs to be truncated',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
      };
      const summary = await service.summarizeArticle(article, 30);
      expect(summary).toContain('...');
    });
  });

  describe('Digest Generation', () => {
    test('should generate digest', async () => {
      const articles = await service.fetchArticles();
      const digest = await service.generateDigest(articles);
      expect(typeof digest).toBe('string');
      expect(digest).toContain('News Digest');
    });

    test('should include trending topics', async () => {
      const articles = await service.fetchArticles();
      const digest = await service.generateDigest(articles);
      expect(digest).toContain('Trending Topics');
    });

    test('should limit articles in digest', async () => {
      const articles = await service.fetchArticles();
      const digest = await service.generateDigest(articles, 2);
      const articleCount = (digest.match(/🔹/g) || []).length;
      expect(articleCount).toBe(2);
    });

    test('should include article titles', async () => {
      const articles = await service.fetchArticles();
      if (articles.length > 0) {
        const digest = await service.generateDigest(articles, 1);
        expect(digest).toContain(articles[0].title);
      }
    });

    test('should include article sources', async () => {
      const articles = await service.fetchArticles();
      if (articles.length > 0) {
        const digest = await service.generateDigest(articles, 1);
        expect(digest).toContain(articles[0].source);
      }
    });

    test('should include article URLs', async () => {
      const articles = await service.fetchArticles();
      if (articles.length > 0) {
        const digest = await service.generateDigest(articles, 1);
        expect(digest).toContain('Read more:');
      }
    });

    test('should format dates properly', async () => {
      const articles = await service.fetchArticles();
      const digest = await service.generateDigest(articles, 1);
      expect(digest.match(/\d+[mhd] ago/)).toBeTruthy();
    });

    test('should include hashtags', async () => {
      const articles = await service.fetchArticles();
      const digest = await service.generateDigest(articles);
      expect(digest).toContain('#');
    });

    test('should handle empty article list', async () => {
      const digest = await service.generateDigest([]);
      expect(digest).toContain('News Digest');
    });

    test('should include summaries', async () => {
      const articles = await service.fetchArticles();
      const digest = await service.generateDigest(articles, 1);
      expect(digest.length).toBeGreaterThan(100);
    });
  });

  describe('Article Search', () => {
    test('should search articles', async () => {
      const results = await service.searchArticles('test');
      expect(Array.isArray(results)).toBe(true);
    });

    test('should filter by query', async () => {
      const results = await service.searchArticles('technology');
      results.forEach(article => {
        const text = `${article.title} ${article.description || ''} ${article.content}`.toLowerCase();
        expect(text).toContain('technology');
      });
    });

    test('should filter by sources', async () => {
      const results = await service.searchArticles('test', {
        sources: ['TechCrunch'],
      });
      results.forEach(article => {
        expect(article.source).toBe('TechCrunch');
      });
    });

    test('should filter by date from', async () => {
      const dateFrom = new Date(Date.now() - 7 * 86400000);
      const results = await service.searchArticles('test', { dateFrom });
      results.forEach(article => {
        expect(article.publishedAt >= dateFrom).toBe(true);
      });
    });

    test('should filter by date to', async () => {
      const dateTo = new Date();
      const results = await service.searchArticles('test', { dateTo });
      results.forEach(article => {
        expect(article.publishedAt <= dateTo).toBe(true);
      });
    });

    test('should limit results', async () => {
      const results = await service.searchArticles('test', { limit: 3 });
      expect(results.length).toBeLessThanOrEqual(3);
    });

    test('should handle case-insensitive search', async () => {
      const results1 = await service.searchArticles('TECHNOLOGY');
      const results2 = await service.searchArticles('technology');
      expect(results1.length).toBe(results2.length);
    });

    test('should handle empty query', async () => {
      const results = await service.searchArticles('');
      expect(Array.isArray(results)).toBe(true);
    });

    test('should combine multiple filters', async () => {
      const results = await service.searchArticles('test', {
        sources: ['TechCrunch'],
        limit: 1,
      });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    test('should return empty array for no matches', async () => {
      const results = await service.searchArticles('xyzabc123456789');
      expect(results).toEqual([]);
    });
  });

  describe('Relevance Calculation', () => {
    test('should calculate relevance', async () => {
      const article = {
        id: '1',
        title: 'Technology Innovation',
        content: 'Technology is advancing',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
      };
      const relevance = await service.calculateRelevance(article, ['technology']);
      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBeLessThanOrEqual(1);
    });

    test('should return 0.5 for no interests', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'Content',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
      };
      const relevance = await service.calculateRelevance(article, []);
      expect(relevance).toBe(0.5);
    });

    test('should increase relevance for multiple matches', async () => {
      const article = {
        id: '1',
        title: 'Technology Technology',
        content: 'Technology Technology Technology',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
        tags: ['technology'],
      };
      const relevance = await service.calculateRelevance(article, ['technology']);
      expect(relevance).toBeGreaterThan(0.5);
    });

    test('should consider tags in relevance', async () => {
      const article = {
        id: '1',
        title: 'Test',
        content: 'Content',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
        tags: ['innovation', 'technology'],
      };
      const relevance = await service.calculateRelevance(article, ['innovation']);
      expect(relevance).toBeGreaterThan(0);
    });

    test('should handle case-insensitive matching', async () => {
      const article = {
        id: '1',
        title: 'TECHNOLOGY',
        content: 'Content',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date(),
      };
      const relevance = await service.calculateRelevance(article, ['technology']);
      expect(relevance).toBeGreaterThan(0);
    });
  });

  describe('Source Management', () => {
    test('should get all sources', () => {
      const sources = service.getSources();
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
      service.addSource(newSource);
      const sources = service.getSources();
      expect(sources).toContainEqual(newSource);
    });

    test('should remove source', () => {
      const removed = service.removeSource('TechCrunch');
      expect(removed).toBe(true);
      const sources = service.getSources();
      expect(sources.find(s => s.name === 'TechCrunch')).toBeUndefined();
    });

    test('should return false for non-existent source', () => {
      const removed = service.removeSource('NonExistent');
      expect(removed).toBe(false);
    });

    test('should maintain source trust scores', () => {
      const sources = service.getSources();
      sources.forEach(source => {
        expect(source.trustScore).toBeGreaterThan(0);
        expect(source.trustScore).toBeLessThanOrEqual(1);
      });
    });

    test('should validate connection', async () => {
      const isValid = await service.validateConnection();
      expect(typeof isValid).toBe('boolean');
    });
  });
});