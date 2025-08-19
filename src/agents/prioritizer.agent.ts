import { Email, EmailPriority } from '../models/email.model';
import { AgentProcessResult } from '../core/interfaces';
import { BaseAgent } from './base.agent';

export class PrioritizerAgent extends BaseAgent {
  private readonly urgentKeywords = [
    'urgent', 'asap', 'immediately', 'critical', 'emergency',
    'deadline', 'expires', 'time-sensitive', 'action required'
  ];

  private readonly highPriorityDomains = [
    'ceo', 'cto', 'cfo', 'president', 'director', 'manager',
    'vp', 'executive', 'board'
  ];

  async process(email: Email): Promise<AgentProcessResult> {
    return this.measurePerformance('prioritize-email', async () => {
      try {
        const priority = await this.calculatePriority(email);
        const urgencyScore = this.calculateUrgencyScore(email);

        if (priority !== email.priority) {
          this.logger.info(`Email ${email.id} prioritized as ${priority} (score: ${urgencyScore})`);

          return {
            success: true,
            modifications: {
              priority,
              aiAnalysis: {
                ...email.aiAnalysis,
                urgencyScore,
              },
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

  private async calculatePriority(email: Email): Promise<EmailPriority> {
    const urgencyScore = this.calculateUrgencyScore(email);

    if (urgencyScore >= 8) return 'urgent';
    if (urgencyScore >= 6) return 'high';
    if (urgencyScore >= 3) return 'normal';
    return 'low';
  }

  private calculateUrgencyScore(email: Email): number {
    let score = 5;

    const text = `${email.subject} ${email.body}`.toLowerCase();
    const fromEmail = email.from.email.toLowerCase();
    const fromName = (email.from.name || '').toLowerCase();

    const urgentKeywordCount = this.urgentKeywords.filter(
      keyword => text.includes(keyword)
    ).length;
    score += urgentKeywordCount * 1.5;

    const isFromImportantPerson = this.highPriorityDomains.some(
      domain => fromEmail.includes(domain) || fromName.includes(domain)
    );
    if (isFromImportantPerson) score += 3;

    const deadlinePattern = /deadline|due|expires?|by\s+\d{1,2}[/-]\d{1,2}|today|tomorrow/gi;
    const deadlineMatches = text.match(deadlinePattern);
    if (deadlineMatches) score += deadlineMatches.length * 0.5;

    const exclamationCount = (text.match(/!/g) || []).length;
    score += Math.min(exclamationCount * 0.2, 1);

    const capsWordsPattern = /\b[A-Z]{2,}\b/g;
    const capsWords = text.match(capsWordsPattern);
    if (capsWords && capsWords.length > 2) score += 0.5;

    if (email.to.length === 1 && email.to[0].email === email.from.email) {
      score -= 2;
    }

    if (email.cc && email.cc.length > 5) score += 0.5;

    const hoursOld = (Date.now() - email.date.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) score += 1;
    else if (hoursOld < 24) score += 0.5;
    else if (hoursOld > 72) score -= 1;

    if (email.attachments.length > 0) score += 0.5;

    const questionPattern = /\?|please\s+(?:advise|confirm|let\s+me\s+know)/gi;
    const questions = text.match(questionPattern);
    if (questions) score += questions.length * 0.3;

    const meetingPattern = /meeting|call|conference|appointment|schedule/gi;
    if (meetingPattern.test(text)) score += 1;

    return Math.max(0, Math.min(10, score));
  }
}