import { Email, EmailCategory } from '../models/email.model';
import { AgentProcessResult } from '../core/interfaces';
import { BaseAgent } from './base.agent';
import natural from 'natural';

export class CategorizerAgent extends BaseAgent {
  private classifier: natural.BayesClassifier;
  private readonly categoryKeywords: Record<EmailCategory, string[]> = {
    primary: ['important', 'urgent', 'meeting', 'project', 'deadline', 'report'],
    social: ['facebook', 'twitter', 'instagram', 'linkedin', 'social', 'friend'],
    promotions: ['sale', 'discount', 'offer', 'deal', 'save', 'buy', 'shop'],
    updates: ['update', 'newsletter', 'announcement', 'news', 'release'],
    forums: ['forum', 'discussion', 'thread', 'reply', 'comment', 'community'],
    spam: ['viagra', 'casino', 'lottery', 'winner', 'click here', 'free money'],
    important: ['urgent', 'asap', 'critical', 'priority', 'immediate'],
    starred: [],
    sent: [],
    draft: [],
    trash: [],
  };

  constructor(config: any) {
    super(config);
    this.classifier = new natural.BayesClassifier();
    this.trainClassifier();
  }

  private trainClassifier(): void {
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.length > 0) {
        keywords.forEach(keyword => {
          this.classifier.addDocument(keyword, category);
        });
      }
    }
    this.classifier.train();
  }

  async process(email: Email): Promise<AgentProcessResult> {
    return this.measurePerformance('categorize-email', async () => {
      try {
        const category = await this.categorizeEmail(email);
        
        if (category !== email.category) {
          this.logger.info(`Email ${email.id} categorized as ${category}`);
          
          return {
            success: true,
            modifications: {
              category,
              labels: this.updateLabels(email.labels, category),
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  private async categorizeEmail(email: Email): Promise<EmailCategory> {
    const text = `${email.subject} ${email.body}`.toLowerCase();
    
    if (this.isSpam(text, email.from.email)) {
      return 'spam';
    }

    if (this.isPromotion(text)) {
      return 'promotions';
    }

    if (this.isSocial(email.from.email, text)) {
      return 'social';
    }

    if (this.isUpdate(email.from.email, text)) {
      return 'updates';
    }

    if (this.isForum(email.from.email, text)) {
      return 'forums';
    }

    const classifiedCategory = this.classifier.classify(text);
    if (classifiedCategory && classifiedCategory !== 'starred' && 
        classifiedCategory !== 'sent' && classifiedCategory !== 'draft' && 
        classifiedCategory !== 'trash') {
      return classifiedCategory as EmailCategory;
    }

    return 'primary';
  }

  private isSpam(text: string, fromEmail: string): boolean {
    const spamIndicators = [
      /viagra/i,
      /casino/i,
      /lottery/i,
      /you.?ve? won/i,
      /click here now/i,
      /free money/i,
      /guaranteed/i,
      /no credit check/i,
    ];

    const suspiciousDomains = ['spam.com', 'fake.net', 'phishing.org'];
    const domain = fromEmail.split('@')[1];

    return spamIndicators.some(pattern => pattern.test(text)) ||
           suspiciousDomains.includes(domain);
  }

  private isPromotion(text: string): boolean {
    const promotionIndicators = [
      /\d+%\s*off/i,
      /sale/i,
      /discount/i,
      /special offer/i,
      /limited time/i,
      /buy now/i,
      /shop now/i,
      /coupon/i,
    ];

    return promotionIndicators.filter(pattern => pattern.test(text)).length >= 2;
  }

  private isSocial(fromEmail: string, text: string): boolean {
    const socialDomains = [
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com',
      'pinterest.com',
      'tiktok.com',
    ];

    const domain = fromEmail.split('@')[1];
    return socialDomains.some(d => domain.includes(d));
  }

  private isUpdate(_fromEmail: string, text: string): boolean {
    const updateKeywords = ['newsletter', 'update', 'announcement', 'digest'];
    return updateKeywords.some(keyword => text.includes(keyword));
  }

  private isForum(_fromEmail: string, text: string): boolean {
    const forumKeywords = ['forum', 'thread', 'reply', 'discussion', 'comment'];
    return forumKeywords.some(keyword => text.includes(keyword));
  }

  private updateLabels(currentLabels: string[], category: EmailCategory): string[] {
    const labels = new Set(currentLabels);
    labels.add(category);
    
    if (category === 'spam') {
      labels.delete('inbox');
    }

    return Array.from(labels);
  }
}