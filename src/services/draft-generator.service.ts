import { EmailDraft, RecipientProfile, DraftContent, DraftMetrics, EmailCampaign } from '../core/campaign.interfaces';
import { LinkedInService } from '../integrations/linkedin.service';
import { NewsService } from '../integrations/news.service';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import OpenAI from 'openai';

export interface GenerationOptions {
  tone?: 'formal' | 'casual' | 'friendly' | 'professional' | 'persuasive';
  length?: 'short' | 'medium' | 'long';
  includeLinkedIn?: boolean;
  includeNews?: boolean;
  personalizationLevel?: 'low' | 'medium' | 'high';
  optimizeForEngagement?: boolean;
  abTestVariations?: number;
}

export interface ContentOptimization {
  originalContent: string;
  optimizedContent: string;
  improvements: string[];
  predictedLift: number;
}

export class DraftGeneratorService {
  private logger: winston.Logger;
  private linkedInService: LinkedInService;
  private newsService: NewsService;
  private openai?: OpenAI;
  private templates: Map<string, string> = new Map();

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'draft-generator' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });

    this.linkedInService = new LinkedInService();
    this.newsService = new NewsService();

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    this.templates.set('introduction', `
Dear {{name}},

I hope this message finds you well. {{personalized_intro}}

{{main_content}}

{{call_to_action}}

Best regards,
{{sender_name}}
    `);

    this.templates.set('newsletter', `
Hi {{name}}!

{{news_digest}}

{{linkedin_insights}}

{{main_content}}

{{footer}}
    `);

    this.templates.set('follow_up', `
Hi {{name}},

I wanted to follow up on our previous conversation about {{topic}}.

{{main_content}}

{{next_steps}}

Looking forward to hearing from you.

Best,
{{sender_name}}
    `);
  }

  async generateDraft(
    campaign: EmailCampaign,
    recipient: RecipientProfile,
    options: GenerationOptions = {}
  ): Promise<EmailDraft> {
    try {
      this.logger.info(`Generating draft for ${recipient.email}`);

      // Gather personalization data
      const personalizationData = await this.gatherPersonalizationData(recipient, options);

      // Generate content
      const content = await this.generateContent(
        campaign,
        recipient,
        personalizationData,
        options
      );

      // Calculate metrics
      const metrics = await this.calculateMetrics(content);

      // Create draft
      const draft: EmailDraft = {
        id: uuidv4(),
        campaignId: campaign.id,
        status: 'draft',
        recipient,
        content,
        aiGenerated: true,
        aiScore: metrics.personalizationScore * 0.3 + 
                 metrics.predictedOpenRate * 0.3 + 
                 metrics.predictedClickRate * 0.2 +
                 metrics.readabilityScore * 0.2,
        personalizations: personalizationData,
        metrics,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.info(`Generated draft ${draft.id} with AI score: ${draft.aiScore}`);
      return draft;
    } catch (error) {
      this.logger.error('Failed to generate draft:', error);
      throw new Error(`Failed to generate draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateBulkDrafts(
    campaign: EmailCampaign,
    recipients: RecipientProfile[],
    options: GenerationOptions = {}
  ): Promise<EmailDraft[]> {
    try {
      const drafts: EmailDraft[] = [];
      const batchSize = 10;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const batchDrafts = await Promise.all(
          batch.map(recipient => this.generateDraft(campaign, recipient, options))
        );
        drafts.push(...batchDrafts);

        this.logger.info(`Generated ${i + batch.length}/${recipients.length} drafts`);
      }

      return drafts;
    } catch (error) {
      this.logger.error('Failed to generate bulk drafts:', error);
      throw new Error(`Failed to generate bulk drafts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async gatherPersonalizationData(
    recipient: RecipientProfile,
    options: GenerationOptions
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {
      ...recipient.customFields,
      name: recipient.name || 'there',
      company: recipient.company,
      title: recipient.title,
    };

    // Fetch LinkedIn data if enabled
    if (options.includeLinkedIn && recipient.linkedinUrl) {
      try {
        const profile = await this.linkedInService.fetchProfile(recipient.linkedinUrl);
        const insights = await this.linkedInService.generateInsights(profile);
        data.linkedinInsights = insights;
        data.linkedinProfile = profile;
      } catch (error) {
        this.logger.warn(`Failed to fetch LinkedIn data for ${recipient.email}:`, error);
      }
    }

    // Fetch news data if enabled
    if (options.includeNews && recipient.preferences.topics.length > 0) {
      try {
        const articles = await this.newsService.fetchArticles(undefined, recipient.preferences.topics);
        const digest = await this.newsService.generateDigest(articles, 3);
        data.newsDigest = digest;
        data.newsArticles = articles.slice(0, 5);
      } catch (error) {
        this.logger.warn(`Failed to fetch news for ${recipient.email}:`, error);
      }
    }

    // Add engagement history insights
    if (recipient.engagementHistory.length > 0) {
      const recentEngagement = recipient.engagementHistory
        .filter(e => e.timestamp > new Date(Date.now() - 30 * 86400000))
        .length;
      data.engagementLevel = recentEngagement > 5 ? 'high' : recentEngagement > 2 ? 'medium' : 'low';
    }

    return data;
  }

  private async generateContent(
    campaign: EmailCampaign,
    recipient: RecipientProfile,
    personalizationData: Record<string, any>,
    options: GenerationOptions
  ): Promise<DraftContent> {
    try {
      // Select template based on campaign type
      const templateKey = this.selectTemplate(campaign.type);
      let template = this.templates.get(templateKey) || this.templates.get('introduction')!;

      // Apply personalizations
      const personalizedContent = this.applyPersonalizations(
        template,
        campaign.content,
        personalizationData,
        options
      );

      // Generate subject line
      const subject = await this.generateSubjectLine(
        campaign.content.subject,
        recipient,
        personalizationData,
        options
      );

      // Generate preheader
      const preheader = this.generatePreheader(personalizedContent, options);

      // Create CTAs
      const cta = this.generateCTAs(campaign, recipient);

      // Build final content
      const content: DraftContent = {
        subject,
        body: personalizedContent,
        htmlBody: this.convertToHtml(personalizedContent, cta),
        preheader,
        cta,
        linkedinInsights: personalizationData.linkedinInsights,
        newsHighlights: personalizationData.newsDigest,
      };

      // Optimize if requested
      if (options.optimizeForEngagement) {
        return await this.optimizeContent(content, recipient);
      }

      return content;
    } catch (error) {
      this.logger.error('Failed to generate content:', error);
      throw error;
    }
  }

  private selectTemplate(campaignType: string): string {
    switch (campaignType) {
      case 'newsletter':
        return 'newsletter';
      case 'follow_up':
        return 'follow_up';
      default:
        return 'introduction';
    }
  }

  private applyPersonalizations(
    template: string,
    campaignContent: any,
    data: Record<string, any>,
    options: GenerationOptions
  ): string {
    let content = template;

    // Replace all placeholders
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(placeholder, data[key] || '');
    });

    // Add main content
    content = content.replace('{{main_content}}', campaignContent.body || '');

    // Add personalized intro based on level
    const introLevel = options.personalizationLevel || 'medium';
    const intro = this.generatePersonalizedIntro(data, introLevel);
    content = content.replace('{{personalized_intro}}', intro);

    // Clean up any remaining placeholders
    content = content.replace(/{{[^}]+}}/g, '');

    return content.trim();
  }

  private generatePersonalizedIntro(_data: Record<string, any>, level: string): string {
    const intros = {
      low: 'I hope you\'re having a great day.',
      medium: `I noticed you work at ${data.company || 'your company'} and thought you might be interested in this.`,
      high: `${data.linkedinInsights ? `I saw your recent activity on LinkedIn - ${data.linkedinInsights}. ` : ''}Based on your interests in ${data.topics?.join(', ') || 'technology'}, I wanted to share something valuable with you.`,
    };

    return intros[level as keyof typeof intros] || intros.medium;
  }

  private async generateSubjectLine(
    baseSubject: string,
    recipient: RecipientProfile,
    data: Record<string, any>,
    options: GenerationOptions
  ): Promise<string> {
    if (!this.openai) {
      // Fallback to template-based subject
      return baseSubject
        .replace('{{name}}', recipient.name || '')
        .replace('{{company}}', recipient.company || '');
    }

    try {
      const prompt = `Generate an engaging email subject line based on:
        Base subject: ${baseSubject}
        Recipient: ${recipient.name} at ${recipient.company}
        Tone: ${options.tone || 'professional'}
        Keep it under 60 characters and avoid spam words.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.7,
      });

      return response.choices[0].message.content || baseSubject;
    } catch (error) {
      this.logger.warn('Failed to generate AI subject line, using fallback:', error);
      return baseSubject;
    }
  }

  private generatePreheader(content: string, options: GenerationOptions): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentence = sentences[0] || '';
    
    const maxLength = options.length === 'short' ? 50 : options.length === 'long' ? 150 : 100;
    
    if (firstSentence.length <= maxLength) {
      return firstSentence;
    }
    
    return firstSentence.substring(0, maxLength - 3) + '...';
  }

  private generateCTAs(campaign: EmailCampaign, recipient: RecipientProfile): any[] {
    const ctas = [];

    // Primary CTA
    ctas.push({
      text: 'Learn More',
      url: `https://example.com/campaign/${campaign.id}?recipient=${recipient.email}`,
      style: {
        backgroundColor: '#007bff',
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: '5px',
      },
      tracking: true,
    });

    // Secondary CTAs based on preferences
    if (recipient.preferences.topics.includes('webinar')) {
      ctas.push({
        text: 'Register for Webinar',
        url: `https://example.com/webinar?email=${recipient.email}`,
        tracking: true,
      });
    }

    return ctas;
  }

  private convertToHtml(text: string, ctas: any[]): string {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .cta-button { display: inline-block; margin: 10px 5px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
`;

    // Convert text to HTML paragraphs
    const paragraphs = text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`);
    html += paragraphs.join('\n');

    // Add CTAs
    if (ctas.length > 0) {
      html += '<div class="cta-container">';
      ctas.forEach(cta => {
        const style = Object.entries(cta.style || {})
          .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
          .join('; ');
        html += `<a href="${cta.url}" class="cta-button" style="${style}">${cta.text}</a>`;
      });
      html += '</div>';
    }

    html += `
  </div>
</body>
</html>`;

    return html;
  }

  private async optimizeContent(content: DraftContent, recipient: RecipientProfile): Promise<DraftContent> {
    if (!this.openai) {
      return content;
    }

    try {
      const prompt = `Optimize this email content for better engagement:
        Subject: ${content.subject}
        Body: ${content.body}
        Recipient profile: ${JSON.stringify(recipient.preferences)}
        
        Provide optimized subject and key improvements to make.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      const suggestions = response.choices[0].message.content;
      
      // Parse and apply suggestions (simplified for demo)
      if (suggestions?.includes('Subject:')) {
        const newSubject = suggestions.split('Subject:')[1].split('\n')[0].trim();
        content.subject = newSubject || content.subject;
      }

      return content;
    } catch (error) {
      this.logger.warn('Failed to optimize content with AI:', error);
      return content;
    }
  }

  private async calculateMetrics(content: DraftContent): Promise<DraftMetrics> {
    const metrics: DraftMetrics = {
      predictedOpenRate: 0.25,
      predictedClickRate: 0.05,
      sentimentScore: 0.7,
      readabilityScore: 0.8,
      spamScore: 0.2,
      personalizationScore: 0.6,
    };

    // Calculate readability (Flesch Reading Ease approximation)
    const words = content.body.split(/\s+/).length;
    const sentences = content.body.split(/[.!?]+/).length;
    const syllables = content.body.replace(/[^a-zA-Z]/g, '').length / 3; // Rough estimate
    
    const fleschScore = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    metrics.readabilityScore = Math.max(0, Math.min(1, fleschScore / 100));

    // Check for spam indicators
    const spamWords = ['free', 'click here', 'act now', 'limited time', 'guarantee'];
    const spamCount = spamWords.filter(word => 
      content.body.toLowerCase().includes(word) || 
      content.subject.toLowerCase().includes(word)
    ).length;
    metrics.spamScore = Math.min(1, spamCount * 0.2);

    // Estimate open rate based on subject line length and personalization
    const subjectLength = content.subject.length;
    if (subjectLength >= 30 && subjectLength <= 60) {
      metrics.predictedOpenRate += 0.1;
    }
    if (content.subject.includes('{{name}}') || content.linkedinInsights) {
      metrics.predictedOpenRate += 0.15;
    }

    // Estimate click rate based on CTAs and content
    if (content.cta && content.cta.length > 0) {
      metrics.predictedClickRate = 0.08 + (content.cta.length * 0.02);
    }

    // Calculate personalization score
    const personalElements = [
      content.linkedinInsights,
      content.newsHighlights,
      content.body.includes('{{name}}'),
      content.body.includes('{{company}}'),
    ].filter(Boolean).length;
    
    metrics.personalizationScore = personalElements / 4;

    return metrics;
  }

  async generateABTestVariations(
    campaign: EmailCampaign,
    recipient: RecipientProfile,
    count: number = 2
  ): Promise<EmailDraft[]> {
    const variations: EmailDraft[] = [];
    const tones: GenerationOptions['tone'][] = ['professional', 'friendly', 'persuasive'];
    const lengths: GenerationOptions['length'][] = ['short', 'medium', 'long'];

    for (let i = 0; i < count; i++) {
      const options: GenerationOptions = {
        tone: tones[i % tones.length],
        length: lengths[i % lengths.length],
        personalizationLevel: i % 2 === 0 ? 'high' : 'medium',
        optimizeForEngagement: true,
      };

      const draft = await this.generateDraft(campaign, recipient, options);
      draft.content.subject = `[Variant ${String.fromCharCode(65 + i)}] ${draft.content.subject}`;
      variations.push(draft);
    }

    return variations;
  }
}