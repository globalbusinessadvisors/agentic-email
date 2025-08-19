import { Email } from '../models/email.model';
import { AgentProcessResult } from '../core/interfaces';
import { BaseAgent } from './base.agent';
import natural from 'natural';

export class SummarizerAgent extends BaseAgent {
  private tokenizer: natural.WordTokenizer;
  private sentenceTokenizer: natural.SentenceTokenizer;

  constructor(config: any) {
    super(config);
    this.tokenizer = new natural.WordTokenizer();
    this.sentenceTokenizer = new (natural as any).SentenceTokenizer();
  }

  async process(email: Email): Promise<AgentProcessResult> {
    return this.measurePerformance('summarize-email', async () => {
      try {
        const shouldSummarize = this.shouldSummarize(email);
        
        if (!shouldSummarize) {
          return { success: true };
        }

        const summary = await this.generateSummary(email);
        const actionItems = this.extractActionItems(email);
        const entities = this.extractEntities(email);

        this.logger.info(`Email ${email.id} summarized`);

        return {
          success: true,
          modifications: {
            snippet: summary.substring(0, 200),
            aiAnalysis: {
              ...email.aiAnalysis,
              summary,
              actionItems,
              entities,
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  private shouldSummarize(email: Email): boolean {
    const wordCount = this.tokenizer.tokenize(email.body).length;
    return wordCount > 100 || email.body.length > 500;
  }

  private async generateSummary(email: Email): Promise<string> {
    const sentences = this.sentenceTokenizer.tokenize(email.body);
    
    if (sentences.length <= 3) {
      return email.body;
    }

    const sentenceScores = this.scoreSentences(sentences);
    const topSentences = this.selectTopSentences(sentences, sentenceScores, 3);
    
    return topSentences.join(' ');
  }

  private scoreSentences(sentences: string[]): Map<string, number> {
    const wordFreq = this.calculateWordFrequency(sentences.join(' '));
    const scores = new Map<string, number>();

    sentences.forEach(sentence => {
      const words = this.tokenizer.tokenize(sentence.toLowerCase());
      let score = 0;

      words.forEach(word => {
        if (wordFreq.has(word)) {
          score += wordFreq.get(word)!;
        }
      });

      if (words.length > 0) {
        score = score / words.length;
      }

      scores.set(sentence, score);
    });

    return scores;
  }

  private calculateWordFrequency(text: string): Map<string, number> {
    const words = this.tokenizer.tokenize(text.toLowerCase());
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was',
      'were', 'been', 'be', 'being', 'and', 'or', 'but', 'if', 'then',
      'else', 'when', 'where', 'how', 'why', 'what', 'who', 'whom',
      'whose', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'them', 'their', 'our', 'your', 'my', 'his', 'her'
    ]);

    const freq = new Map<string, number>();
    
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    });

    const maxFreq = Math.max(...freq.values());
    freq.forEach((count, word) => {
      freq.set(word, count / maxFreq);
    });

    return freq;
  }

  private selectTopSentences(
    sentences: string[],
    scores: Map<string, number>,
    count: number
  ): string[] {
    const sortedSentences = sentences
      .map(sentence => ({ sentence, score: scores.get(sentence) || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.sentence);

    const originalOrder = sentences.filter(s => sortedSentences.includes(s));
    return originalOrder;
  }

  private extractActionItems(email: Email): string[] {
    const text = email.body.toLowerCase();
    const actionItems: string[] = [];

    const actionPatterns = [
      /please\s+([^.!?]+)/g,
      /could\s+you\s+([^.!?]+)/g,
      /would\s+you\s+([^.!?]+)/g,
      /can\s+you\s+([^.!?]+)/g,
      /need\s+(?:you\s+)?to\s+([^.!?]+)/g,
      /(?:must|should|have to)\s+([^.!?]+)/g,
      /action\s*:\s*([^.!?]+)/gi,
      /todo\s*:\s*([^.!?]+)/gi,
      /task\s*:\s*([^.!?]+)/gi,
    ];

    actionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const action = match[1].trim();
        if (action.length > 10 && action.length < 200) {
          actionItems.push(action);
        }
      }
    });

    return [...new Set(actionItems)].slice(0, 5);
  }

  private extractEntities(email: Email): Array<{ text: string; type: string; salience: number }> {
    const text = `${email.subject} ${email.body}`;
    const entities: Array<{ text: string; type: string; salience: number }> = [];

    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern) || [];
    emails.forEach(email => {
      entities.push({ text: email, type: 'EMAIL', salience: 0.8 });
    });

    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const urls = text.match(urlPattern) || [];
    urls.forEach(url => {
      entities.push({ text: url, type: 'URL', salience: 0.7 });
    });

    const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g;
    const phones = text.match(phonePattern) || [];
    phones.forEach(phone => {
      if (phone.length >= 10) {
        entities.push({ text: phone, type: 'PHONE', salience: 0.6 });
      }
    });

    const datePattern = /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi;
    const dates = text.match(datePattern) || [];
    dates.forEach(date => {
      entities.push({ text: date, type: 'DATE', salience: 0.5 });
    });

    const moneyPattern = /\$[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP)\b/g;
    const amounts = text.match(moneyPattern) || [];
    amounts.forEach(amount => {
      entities.push({ text: amount, type: 'MONEY', salience: 0.7 });
    });

    return entities.slice(0, 10);
  }
}