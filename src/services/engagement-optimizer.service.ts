import { EmailDraft, CampaignMetrics, EngagementEvent } from '../core/campaign.interfaces';
import winston from 'winston';

export interface OptimizationStrategy {
  name: string;
  description: string;
  apply(draft: EmailDraft): EmailDraft;
  score(metrics: CampaignMetrics): number;
}

export interface EngagementPrediction {
  openRate: number;
  clickRate: number;
  conversionRate: number;
  unsubscribeRisk: number;
  confidence: number;
  factors: EngagementFactor[];
}

export interface EngagementFactor {
  name: string;
  impact: number; // -1 to 1
  description: string;
}

export interface ABTestResult {
  variantA: TestVariant;
  variantB: TestVariant;
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  recommendation: string;
}

export interface TestVariant {
  id: string;
  subject: string;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  sampleSize: number;
}

export class EngagementOptimizerService {
  private logger: winston.Logger;
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private historicalData: Map<string, EngagementEvent[]> = new Map();

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'engagement-optimizer' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });

    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Subject Line Optimization
    this.strategies.set('subject-optimization', {
      name: 'Subject Line Optimizer',
      description: 'Optimizes subject lines for higher open rates',
      apply: (draft: EmailDraft) => {
        const optimized = { ...draft };
        
        // Add personalization if not present
        if (!draft.content.subject.includes(draft.recipient.name || '')) {
          optimized.content.subject = `${draft.recipient.name}, ${draft.content.subject}`;
        }

        // Add urgency indicators for time-sensitive content
        const urgencyWords = ['limited', 'exclusive', 'today', 'now'];
        const hasUrgency = urgencyWords.some(word => 
          draft.content.subject.toLowerCase().includes(word)
        );

        if (!hasUrgency && Math.random() > 0.5) {
          optimized.content.subject = `[Today Only] ${optimized.content.subject}`;
        }

        // Optimize length (30-60 characters is optimal)
        if (optimized.content.subject.length > 60) {
          optimized.content.subject = optimized.content.subject.substring(0, 57) + '...';
        }

        return optimized;
      },
      score: (metrics: CampaignMetrics) => {
        return metrics.opened / Math.max(1, metrics.sent);
      },
    });

    // Send Time Optimization
    this.strategies.set('send-time-optimization', {
      name: 'Send Time Optimizer',
      description: 'Determines optimal send times based on recipient behavior',
      apply: (draft: EmailDraft) => {
        const optimized = { ...draft };
        
        // Analyze recipient's engagement history
        const history = draft.recipient.engagementHistory;
        if (history.length > 0) {
          const openTimes = history
            .filter(e => e.type === 'opened')
            .map(e => e.timestamp.getHours());
          
          if (openTimes.length > 0) {
            const avgHour = Math.round(
              openTimes.reduce((a, b) => a + b, 0) / openTimes.length
            );
            
            const scheduledTime = new Date();
            scheduledTime.setHours(avgHour, 0, 0, 0);
            if (scheduledTime < new Date()) {
              scheduledTime.setDate(scheduledTime.getDate() + 1);
            }
            
            optimized.scheduledAt = scheduledTime;
          }
        }

        return optimized;
      },
      score: (metrics: CampaignMetrics) => {
        return metrics.timing.avgTimeToOpen > 0 ? 1 / metrics.timing.avgTimeToOpen : 0;
      },
    });

    // Content Personalization
    this.strategies.set('content-personalization', {
      name: 'Content Personalizer',
      description: 'Enhances content personalization based on recipient data',
      apply: (draft: EmailDraft) => {
        const optimized = { ...draft };
        
        // Add dynamic content based on recipient preferences
        if (draft.recipient.preferences.topics.length > 0) {
          const topicContent = `\n\nBased on your interest in ${draft.recipient.preferences.topics.join(', ')}, you might also like...`;
          optimized.content.body += topicContent;
        }

        // Add company-specific content
        if (draft.recipient.company) {
          const companyContent = `\n\nSpecifically for ${draft.recipient.company} teams...`;
          optimized.content.body = optimized.content.body.replace(
            '{{company_section}}',
            companyContent
          );
        }

        return optimized;
      },
      score: (metrics: CampaignMetrics) => {
        return metrics.contentScore;
      },
    });

    // CTA Optimization
    this.strategies.set('cta-optimization', {
      name: 'CTA Optimizer',
      description: 'Optimizes call-to-action buttons and links',
      apply: (draft: EmailDraft) => {
        const optimized = { ...draft };
        
        if (optimized.content.cta && optimized.content.cta.length > 0) {
          // Make CTA text more action-oriented
          optimized.content.cta = optimized.content.cta.map(cta => ({
            ...cta,
            text: this.optimizeCTAText(cta.text),
            style: {
              ...cta.style,
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '12px 24px',
            },
          }));
        }

        return optimized;
      },
      score: (metrics: CampaignMetrics) => {
        return metrics.clicked / Math.max(1, metrics.opened);
      },
    });
  }

  async optimizeDraft(draft: EmailDraft, strategies?: string[]): Promise<EmailDraft> {
    try {
      let optimized = { ...draft };
      const strategiesToApply = strategies || Array.from(this.strategies.keys());

      for (const strategyName of strategiesToApply) {
        const strategy = this.strategies.get(strategyName);
        if (strategy) {
          optimized = strategy.apply(optimized);
          this.logger.info(`Applied ${strategy.name} to draft ${draft.id}`);
        }
      }

      // Recalculate metrics after optimization
      optimized.metrics = await this.predictEngagement(optimized);

      return optimized;
    } catch (error) {
      this.logger.error('Failed to optimize draft:', error);
      throw new Error(`Failed to optimize draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async predictEngagement(draft: EmailDraft): Promise<any> {
    try {
      const prediction: EngagementPrediction = {
        openRate: 0.25,
        clickRate: 0.05,
        conversionRate: 0.02,
        unsubscribeRisk: 0.01,
        confidence: 0.7,
        factors: [],
      };

      // Analyze subject line
      const subjectLength = draft.content.subject.length;
      if (subjectLength >= 30 && subjectLength <= 60) {
        prediction.openRate += 0.05;
        prediction.factors.push({
          name: 'Optimal subject length',
          impact: 0.2,
          description: 'Subject line is within optimal length range',
        });
      }

      // Check personalization
      if (draft.content.subject.includes(draft.recipient.name || '')) {
        prediction.openRate += 0.1;
        prediction.factors.push({
          name: 'Personalized subject',
          impact: 0.4,
          description: 'Subject line includes recipient name',
        });
      }

      // Analyze content
      const contentLength = draft.content.body.length;
      if (contentLength > 100 && contentLength < 500) {
        prediction.clickRate += 0.02;
        prediction.factors.push({
          name: 'Optimal content length',
          impact: 0.15,
          description: 'Content is concise and readable',
        });
      }

      // Check for CTAs
      if (draft.content.cta && draft.content.cta.length > 0) {
        prediction.clickRate += 0.03 * Math.min(3, draft.content.cta.length);
        prediction.factors.push({
          name: 'Clear CTAs',
          impact: 0.3,
          description: `${draft.content.cta.length} call-to-action buttons present`,
        });
      }

      // Historical engagement analysis
      if (draft.recipient.engagementHistory.length > 0) {
        const recentEngagement = draft.recipient.engagementHistory
          .filter(e => e.timestamp > new Date(Date.now() - 30 * 86400000));
        
        const engagementRate = recentEngagement.length / 30;
        prediction.openRate *= (1 + engagementRate);
        prediction.confidence += 0.1;
        
        prediction.factors.push({
          name: 'Historical engagement',
          impact: engagementRate,
          description: `Recipient has ${recentEngagement.length} recent interactions`,
        });
      }

      // Check for spam indicators
      const spamWords = ['free', 'guarantee', 'act now', 'limited time'];
      const spamCount = spamWords.filter(word => 
        draft.content.body.toLowerCase().includes(word) ||
        draft.content.subject.toLowerCase().includes(word)
      ).length;

      if (spamCount > 0) {
        prediction.openRate *= 0.8;
        prediction.unsubscribeRisk += 0.05 * spamCount;
        prediction.factors.push({
          name: 'Spam indicators',
          impact: -0.2 * spamCount,
          description: `Found ${spamCount} potential spam triggers`,
        });
      }

      return {
        predictedOpenRate: Math.min(1, prediction.openRate),
        predictedClickRate: Math.min(1, prediction.clickRate),
        sentimentScore: 0.7,
        readabilityScore: 0.8,
        spamScore: Math.min(1, spamCount * 0.2),
        personalizationScore: prediction.factors.filter(f => f.impact > 0).length / 10,
      };
    } catch (error) {
      this.logger.error('Failed to predict engagement:', error);
      return {
        predictedOpenRate: 0.25,
        predictedClickRate: 0.05,
        sentimentScore: 0.5,
        readabilityScore: 0.5,
        spamScore: 0.5,
        personalizationScore: 0.5,
      };
    }
  }

  async runABTest(variantA: EmailDraft, variantB: EmailDraft, sampleSize: number = 100): Promise<ABTestResult> {
    try {
      // Simulate A/B test results (in production, this would analyze real data)
      const resultA: TestVariant = {
        id: variantA.id,
        subject: variantA.content.subject,
        openRate: (variantA.metrics?.predictedOpenRate || 0.25) + (Math.random() - 0.5) * 0.1,
        clickRate: (variantA.metrics?.predictedClickRate || 0.05) + (Math.random() - 0.5) * 0.02,
        conversionRate: 0.02 + (Math.random() - 0.5) * 0.01,
        sampleSize: sampleSize / 2,
      };

      const resultB: TestVariant = {
        id: variantB.id,
        subject: variantB.content.subject,
        openRate: (variantB.metrics?.predictedOpenRate || 0.25) + (Math.random() - 0.5) * 0.1,
        clickRate: (variantB.metrics?.predictedClickRate || 0.05) + (Math.random() - 0.5) * 0.02,
        conversionRate: 0.02 + (Math.random() - 0.5) * 0.01,
        sampleSize: sampleSize / 2,
      };

      // Calculate statistical significance
      const zScore = this.calculateZScore(resultA, resultB);
      const confidence = this.getConfidenceLevel(zScore);

      // Determine winner
      let winner: 'A' | 'B' | 'tie' = 'tie';
      let recommendation = 'Results are not statistically significant. Consider running a larger test.';

      if (confidence > 0.95) {
        const scoreA = resultA.openRate * 0.5 + resultA.clickRate * 0.3 + resultA.conversionRate * 0.2;
        const scoreB = resultB.openRate * 0.5 + resultB.clickRate * 0.3 + resultB.conversionRate * 0.2;
        
        if (scoreA > scoreB) {
          winner = 'A';
          recommendation = `Variant A performs ${((scoreA - scoreB) * 100).toFixed(1)}% better. Recommend using this version.`;
        } else if (scoreB > scoreA) {
          winner = 'B';
          recommendation = `Variant B performs ${((scoreB - scoreA) * 100).toFixed(1)}% better. Recommend using this version.`;
        }
      }

      const result: ABTestResult = {
        variantA: resultA,
        variantB: resultB,
        winner,
        confidence,
        recommendation,
      };

      this.logger.info(`A/B test completed: Winner is ${winner} with ${(confidence * 100).toFixed(1)}% confidence`);
      return result;
    } catch (error) {
      this.logger.error('Failed to run A/B test:', error);
      throw new Error(`Failed to run A/B test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeHistoricalPerformance(recipientEmail: string): Promise<any> {
    try {
      const history = this.historicalData.get(recipientEmail) || [];
      
      if (history.length === 0) {
        return {
          averageOpenRate: 0,
          averageClickRate: 0,
          bestSendTime: null,
          preferredTopics: [],
          engagementTrend: 'unknown',
        };
      }

      const opens = history.filter(e => e.type === 'opened').length;
      const clicks = history.filter(e => e.type === 'clicked').length;
      const sent = history.filter(e => e.type === 'sent').length;

      const openTimes = history
        .filter(e => e.type === 'opened')
        .map(e => e.timestamp.getHours());

      const bestHour = openTimes.length > 0
        ? this.findMode(openTimes)
        : null;

      // Analyze engagement trend
      const recentHistory = history.filter(e => 
        e.timestamp > new Date(Date.now() - 30 * 86400000)
      );
      const olderHistory = history.filter(e => 
        e.timestamp <= new Date(Date.now() - 30 * 86400000) &&
        e.timestamp > new Date(Date.now() - 60 * 86400000)
      );

      let trend = 'stable';
      if (recentHistory.length > olderHistory.length * 1.2) {
        trend = 'increasing';
      } else if (recentHistory.length < olderHistory.length * 0.8) {
        trend = 'decreasing';
      }

      return {
        averageOpenRate: sent > 0 ? opens / sent : 0,
        averageClickRate: opens > 0 ? clicks / opens : 0,
        bestSendTime: bestHour ? `${bestHour}:00` : null,
        preferredTopics: this.extractTopics(history),
        engagementTrend: trend,
        totalInteractions: history.length,
        lastEngagement: history[history.length - 1]?.timestamp,
      };
    } catch (error) {
      this.logger.error('Failed to analyze historical performance:', error);
      throw new Error(`Failed to analyze performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recommendOptimizations(draft: EmailDraft): Promise<string[]> {
    const recommendations: string[] = [];

    // Subject line recommendations
    if (draft.content.subject.length > 60) {
      recommendations.push('Shorten subject line to under 60 characters for better mobile display');
    }
    if (!draft.content.subject.includes(draft.recipient.name || '')) {
      recommendations.push('Add recipient name to subject line for higher open rates');
    }

    // Content recommendations
    const wordCount = draft.content.body.split(/\s+/).length;
    if (wordCount > 200) {
      recommendations.push('Consider shortening email content for better engagement');
    }
    if (!draft.content.cta || draft.content.cta.length === 0) {
      recommendations.push('Add a clear call-to-action button to improve click rates');
    }

    // Timing recommendations
    const history = await this.analyzeHistoricalPerformance(draft.recipient.email);
    if (history.bestSendTime) {
      recommendations.push(`Schedule send time for ${history.bestSendTime} based on recipient\'s engagement history`);
    }

    // Personalization recommendations
    if (!draft.content.linkedinInsights && draft.recipient.linkedinUrl) {
      recommendations.push('Include LinkedIn insights for better personalization');
    }
    if (!draft.content.newsHighlights && draft.recipient.preferences.topics.length > 0) {
      recommendations.push('Add relevant news content based on recipient interests');
    }

    return recommendations;
  }

  private optimizeCTAText(text: string): string {
    const actionWords = {
      'Click here': 'Get Started',
      'Learn more': 'Discover More',
      'Submit': 'Get Access',
      'Download': 'Get Your Copy',
      'Sign up': 'Join Now',
      'Buy now': 'Shop Now',
    };

    for (const [original, optimized] of Object.entries(actionWords)) {
      if (text.toLowerCase().includes(original.toLowerCase())) {
        return text.replace(new RegExp(original, 'gi'), optimized);
      }
    }

    return text;
  }

  private calculateZScore(variantA: TestVariant, variantB: TestVariant): number {
    const pA = variantA.openRate;
    const pB = variantB.openRate;
    const nA = variantA.sampleSize;
    const nB = variantB.sampleSize;

    const pPooled = (pA * nA + pB * nB) / (nA + nB);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1/nA + 1/nB));

    return (pA - pB) / se;
  }

  private getConfidenceLevel(zScore: number): number {
    const absZ = Math.abs(zScore);
    if (absZ >= 2.58) return 0.99;
    if (absZ >= 1.96) return 0.95;
    if (absZ >= 1.645) return 0.90;
    return absZ / 2.58; // Rough approximation for lower values
  }

  private findMode(arr: number[]): number {
    const frequency: Record<number, number> = {};
    let maxFreq = 0;
    let mode = arr[0];

    for (const num of arr) {
      frequency[num] = (frequency[num] || 0) + 1;
      if (frequency[num] > maxFreq) {
        maxFreq = frequency[num];
        mode = num;
      }
    }

    return mode;
  }

  private extractTopics(history: EngagementEvent[]): string[] {
    // In production, this would analyze email content from engaged emails
    const topics = ['technology', 'business', 'innovation'];
    return topics.slice(0, Math.min(3, history.length / 10));
  }

  addHistoricalData(recipientEmail: string, events: EngagementEvent[]): void {
    const existing = this.historicalData.get(recipientEmail) || [];
    this.historicalData.set(recipientEmail, [...existing, ...events]);
  }
}