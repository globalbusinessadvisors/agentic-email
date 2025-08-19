import { NewsSource } from '../core/campaign.interfaces';
import winston from 'winston';
import { z } from 'zod';

export interface NewsArticle {
  id: string;
  title: string;
  description?: string;
  content: string;
  url: string;
  source: string;
  author?: string;
  publishedAt: Date;
  category?: string;
  tags?: string[];
  imageUrl?: string;
  relevanceScore?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  summary?: string;
}

export interface NewsFeed {
  source: string;
  articles: NewsArticle[];
  lastUpdated: Date;
  totalArticles: number;
}

export interface NewsAnalysis {
  topTopics: string[];
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  trendingKeywords: string[];
  categoryCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
}

// Validation schema for news articles
z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  content: z.string(),
  url: z.string().url(),
  source: z.string(),
  author: z.string().optional(),
  publishedAt: z.date(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  summary: z.string().optional(),
});

export class NewsService {
  private logger: winston.Logger;
  private cache: Map<string, { data: any; timestamp: Date }> = new Map();
  private cacheTimeout = 1800000; // 30 minutes
  private sources: NewsSource[] = [];

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'news-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });

    this.initializeDefaultSources();
  }

  private initializeDefaultSources(): void {
    this.sources = [
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com',
        rssUrl: 'https://techcrunch.com/feed/',
        category: 'technology',
        trustScore: 0.9,
      },
      {
        name: 'Reuters',
        url: 'https://reuters.com',
        rssUrl: 'https://feeds.reuters.com/reuters/topNews',
        category: 'general',
        trustScore: 0.95,
      },
      {
        name: 'Bloomberg',
        url: 'https://bloomberg.com',
        rssUrl: 'https://feeds.bloomberg.com/markets/news.rss',
        category: 'business',
        trustScore: 0.92,
      },
      {
        name: 'The Verge',
        url: 'https://theverge.com',
        rssUrl: 'https://www.theverge.com/rss/index.xml',
        category: 'technology',
        trustScore: 0.88,
      },
      {
        name: 'HackerNews',
        url: 'https://news.ycombinator.com',
        rssUrl: 'https://news.ycombinator.com/rss',
        category: 'technology',
        trustScore: 0.85,
      },
    ];
  }

  async fetchArticles(sources?: NewsSource[], topics?: string[]): Promise<NewsArticle[]> {
    try {
      const sourcesToUse = sources || this.sources;
      const allArticles: NewsArticle[] = [];

      for (const source of sourcesToUse) {
        try {
          const articles = await this.fetchFromSource(source, topics);
          allArticles.push(...articles);
        } catch (error) {
          this.logger.warn(`Failed to fetch from ${source.name}:`, error);
        }
      }

      // Sort by relevance and date
      allArticles.sort((a, b) => {
        const scoreA = (a.relevanceScore || 0.5) * 0.7 + (Date.now() - a.publishedAt.getTime()) / (86400000 * 7) * 0.3;
        const scoreB = (b.relevanceScore || 0.5) * 0.7 + (Date.now() - b.publishedAt.getTime()) / (86400000 * 7) * 0.3;
        return scoreB - scoreA;
      });

      this.logger.info(`Fetched ${allArticles.length} articles from ${sourcesToUse.length} sources`);
      return allArticles;
    } catch (error) {
      this.logger.error('Failed to fetch news articles:', error);
      throw new Error(`Failed to fetch articles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchFromSource(source: NewsSource, topics?: string[]): Promise<NewsArticle[]> {
    const cacheKey = `${source.name}-${topics?.join(',') || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Mock data for demonstration
    const articles: NewsArticle[] = [
      {
        id: `${source.name}-1`,
        title: `Breaking: Major AI Breakthrough at ${source.name}`,
        description: 'Revolutionary new AI model achieves human-level performance',
        content: 'A team of researchers has announced a significant breakthrough in artificial intelligence...',
        url: `${source.url}/article-1`,
        source: source.name,
        author: 'Tech Reporter',
        publishedAt: new Date(Date.now() - Math.random() * 86400000 * 7),
        category: source.category,
        tags: ['AI', 'technology', 'innovation'],
        relevanceScore: 0.95,
        sentiment: 'positive',
        summary: 'Major AI breakthrough announced with significant implications for the industry.',
      },
      {
        id: `${source.name}-2`,
        title: 'Market Analysis: Tech Stocks Surge',
        description: 'Technology sector leads market gains',
        content: 'Tech stocks continued their upward trajectory today as investors...',
        url: `${source.url}/article-2`,
        source: source.name,
        author: 'Market Analyst',
        publishedAt: new Date(Date.now() - Math.random() * 86400000 * 3),
        category: 'business',
        tags: ['stocks', 'technology', 'markets'],
        relevanceScore: 0.82,
        sentiment: 'positive',
        summary: 'Tech stocks show strong performance in today\'s trading.',
      },
    ];

    // Filter by topics if provided
    let filtered = articles;
    if (topics && topics.length > 0) {
      filtered = articles.filter(article => {
        const articleText = `${article.title} ${article.description} ${article.content}`.toLowerCase();
        return topics.some(topic => articleText.includes(topic.toLowerCase()));
      });
    }

    // Apply trust score to relevance
    filtered = filtered.map(article => ({
      ...article,
      relevanceScore: (article.relevanceScore || 0.5) * source.trustScore,
    }));

    this.setCached(cacheKey, filtered);
    return filtered;
  }

  async analyzeArticles(articles: NewsArticle[]): Promise<NewsAnalysis> {
    try {
      const analysis: NewsAnalysis = {
        topTopics: [],
        sentimentDistribution: {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
        trendingKeywords: [],
        categoryCounts: {},
        sourceCounts: {},
      };

      // Count sentiments
      articles.forEach(article => {
        const sentiment = article.sentiment || 'neutral';
        analysis.sentimentDistribution[sentiment]++;

        // Count categories
        if (article.category) {
          analysis.categoryCounts[article.category] = (analysis.categoryCounts[article.category] || 0) + 1;
        }

        // Count sources
        analysis.sourceCounts[article.source] = (analysis.sourceCounts[article.source] || 0) + 1;
      });

      // Extract top topics and keywords
      const keywordCounts: Record<string, number> = {};
      articles.forEach(article => {
        article.tags?.forEach(tag => {
          keywordCounts[tag] = (keywordCounts[tag] || 0) + 1;
        });
      });

      analysis.trendingKeywords = Object.entries(keywordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([keyword]) => keyword);

      analysis.topTopics = analysis.trendingKeywords.slice(0, 5);

      this.logger.info('Completed news analysis');
      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze articles:', error);
      throw new Error(`Failed to analyze articles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async summarizeArticle(article: NewsArticle, maxLength: number = 150): Promise<string> {
    try {
      if (article.summary) {
        return article.summary.substring(0, maxLength);
      }

      // Simple summarization - in production, this would use AI
      const sentences = article.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const importantSentences = sentences.slice(0, 3);
      let summary = importantSentences.join('. ') + '.';

      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
      }

      return summary;
    } catch (error) {
      this.logger.error('Failed to summarize article:', error);
      return article.description || article.title;
    }
  }

  async generateDigest(articles: NewsArticle[], maxArticles: number = 5): Promise<string> {
    try {
      const topArticles = articles.slice(0, maxArticles);
      const digest: string[] = ['📰 News Digest\n'];

      for (const article of topArticles) {
        const summary = await this.summarizeArticle(article, 100);
        digest.push(`\n🔹 ${article.title}`);
        digest.push(`   ${article.source} | ${this.formatDate(article.publishedAt)}`);
        digest.push(`   ${summary}`);
        digest.push(`   Read more: ${article.url}`);
      }

      const analysis = await this.analyzeArticles(articles);
      digest.push('\n\n📊 Trending Topics:');
      digest.push(analysis.topTopics.map(t => `#${t}`).join(' '));

      return digest.join('\n');
    } catch (error) {
      this.logger.error('Failed to generate digest:', error);
      throw new Error(`Failed to generate digest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchArticles(query: string, options?: {
    sources?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<NewsArticle[]> {
    try {
      let articles = await this.fetchArticles();

      // Filter by query
      articles = articles.filter(article => {
        const searchText = `${article.title} ${article.description} ${article.content}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      // Filter by sources
      if (options?.sources && options.sources.length > 0) {
        articles = articles.filter(article => 
          options.sources!.includes(article.source)
        );
      }

      // Filter by date range
      if (options?.dateFrom) {
        articles = articles.filter(article => 
          article.publishedAt >= options.dateFrom!
        );
      }

      if (options?.dateTo) {
        articles = articles.filter(article => 
          article.publishedAt <= options.dateTo!
        );
      }

      // Apply limit
      if (options?.limit) {
        articles = articles.slice(0, options.limit);
      }

      this.logger.info(`Search returned ${articles.length} articles for query: ${query}`);
      return articles;
    } catch (error) {
      this.logger.error(`Failed to search articles for: ${query}`, error);
      throw new Error(`Failed to search articles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async calculateRelevance(article: NewsArticle, interests: string[]): Promise<number> {
    try {
      if (!interests || interests.length === 0) {
        return 0.5;
      }

      const articleText = `${article.title} ${article.description} ${article.content} ${article.tags?.join(' ')}`.toLowerCase();
      let matchCount = 0;
      let totalWeight = 0;

      interests.forEach(interest => {
        const interestLower = interest.toLowerCase();
        const count = (articleText.match(new RegExp(interestLower, 'g')) || []).length;
        matchCount += count;
        totalWeight += interest.length;
      });

      const relevance = Math.min(1, (matchCount * 10) / totalWeight);
      return Number(relevance.toFixed(2));
    } catch (error) {
      this.logger.error('Failed to calculate relevance:', error);
      return 0.5;
    }
  }

  addSource(source: NewsSource): void {
    this.sources.push(source);
    this.logger.info(`Added news source: ${source.name}`);
  }

  removeSource(sourceName: string): boolean {
    const initialLength = this.sources.length;
    this.sources = this.sources.filter(s => s.name !== sourceName);
    const removed = this.sources.length < initialLength;
    
    if (removed) {
      this.logger.info(`Removed news source: ${sourceName}`);
    }
    
    return removed;
  }

  getSources(): NewsSource[] {
    return [...this.sources];
  }

  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: new Date() });
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const articles = await this.fetchArticles(this.sources.slice(0, 1), ['test']);
      return articles.length >= 0;
    } catch (error) {
      this.logger.error('News service connection validation failed:', error);
      return false;
    }
  }
}