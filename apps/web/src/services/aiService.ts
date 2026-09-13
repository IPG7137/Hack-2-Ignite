import { IAIService } from './api.interface';
import { AIOperationalInsight, CopilotMessage } from '../types/ai';
import { Complaint } from '../types/complaint';
import { MOCK_AI_INSIGHTS } from './mock/aiInsightsMock';
import { CopilotService, CopilotSecurityContext } from './copilotService';

class LiveAIService implements IAIService {
  private insights: AIOperationalInsight[] = [...MOCK_AI_INSIGHTS];

  async getOperationalInsights(): Promise<AIOperationalInsight[]> {
    await new Promise((res) => setTimeout(res, 40));
    return [...this.insights];
  }

  async acknowledgeInsight(id: string): Promise<void> {
    const found = this.insights.find((i) => i.id === id);
    if (found) found.acknowledged = true;
  }

  async askCopilot(question: string, contextComplaints: Complaint[], securityContext?: CopilotSecurityContext): Promise<CopilotMessage> {
    return CopilotService.answerOfficerQuery(question, contextComplaints, securityContext);
  }
}

export const aiService = new LiveAIService();
