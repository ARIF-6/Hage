import OpenAI from 'openai';
import { KnowledgeService, KnowledgeItem } from './knowledgeService';

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiResponseResult {
  reply: string;
  suggestedActions?: { label: string; prompt: string }[];
  canEscalate?: boolean;
  modelUsed: string;
  source: 'openai' | 'knowledge_base';
}

export class AiService {
  private static openaiClient: OpenAI | null = null;

  private static getClient(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    if (!AiService.openaiClient) {
      AiService.openaiClient = new OpenAI({ apiKey });
    }
    return AiService.openaiClient;
  }

  public static async generateResponse(
    userMessage: string,
    history: ChatTurn[] = [],
    userContext?: { name?: string; email?: string }
  ): Promise<AiResponseResult> {
    const client = this.getClient();
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const isAiEnabled = process.env.AI_SUPPORT_ENABLED !== 'false';
    const mode = process.env.AI_SUPPORT_MODE || 'combined'; // 'application' | 'general' | 'combined'

    // 1. Retrieve Grounded Documentation (RAG)
    const contextDocs = KnowledgeService.getContextBlock(userMessage);
    const matchedDocs = KnowledgeService.search(userMessage, 2);

    // Extract suggested prompts from matched knowledge
    const defaultSuggestions: { label: string; prompt: string }[] = [];
    matchedDocs.forEach(doc => {
      if (doc.suggestedPrompts) {
        doc.suggestedPrompts.forEach(p => {
          if (!defaultSuggestions.some(s => s.prompt === p.prompt)) {
            defaultSuggestions.push(p);
          }
        });
      }
    });

    const isEscalationRequest = /ticket|human|agent|support team|complaint|refund|bug|error/i.test(userMessage);

    // 2. Try OpenAI API if client is available and enabled
    if (client && isAiEnabled) {
      try {
        const systemPrompt = `You are HAGE AI, the intelligent assistant for HAGE — a next-generation institutional prop firm and trading journal platform.

Conversation style:
- Be natural, concise, and direct. Answer what the user actually asked.
- Do not open with a feature list, menu, or predefined options.
- Maintain conversational memory within this session.
- Give short answers by default; expand when the user asks for more detail.
- Ask follow-up questions only when genuinely needed to clarify.
- Never repeat a greeting after the first message.
- Match the user's tone and language where possible.
- If the answer is unknown, say so honestly rather than inventing information.
- Do not turn every reply into a support menu or force the user to select a category.

When information is relevant, use the verified HAGE documentation below. Only surface pricing, drawdown rules, or feature details when the user's question specifically calls for it.

Operating mode: ${mode}.
${mode === 'application' ? 'Strictly prioritize application documentation for off-topic queries.' : 'For HAGE-specific questions use the docs; for general trading questions give sound, accurate advice.'}

--- VERIFIED HAGE DOCUMENTATION (use only when relevant) ---
${contextDocs}
------------------------------------------------------------

${userContext?.name ? `User: ${userContext.name}` : ''}${userContext?.email ? ` (${userContext.email})` : ''}`;

        // Truncate history to sliding context window (last 6 messages)
        const recentHistory = history.slice(-6).map(h => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content
        })) as Array<{ role: 'user' | 'assistant'; content: string }>;

        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...recentHistory,
            { role: 'user', content: userMessage }
          ],
          max_tokens: parseInt(process.env.AI_SUPPORT_MAX_OUTPUT_TOKENS || '750', 10),
          temperature: 0.3,
          // Ensure we always get a text response, never an empty output
          stop: undefined
        });

        // Safely validate the OpenAI response - guard against empty content
        const choice = completion.choices?.[0];
        const finishReason = choice?.finish_reason;
        const rawContent = choice?.message?.content;

        if (!rawContent || rawContent.trim().length === 0) {
          // OpenAI returned an empty response (can happen with content filtering or model quirks)
          console.warn(`OpenAI returned empty content (finish_reason: ${finishReason}), falling back to knowledge base`);
          return this.generateFallbackResponse(userMessage, matchedDocs, isEscalationRequest);
        }

        const reply = rawContent.trim();

        return {
          reply,
          suggestedActions: defaultSuggestions.slice(0, 3),
          canEscalate: isEscalationRequest,
          modelUsed: model,
          source: 'openai'
        };
      } catch (err: unknown) {
        // Catch all thrown values (Error objects, strings, OpenAI SDK errors, etc.)
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn('OpenAI API request failed, gracefully falling back to HAGE Knowledge Engine:', errMsg);
        // Fallback to internal knowledge engine below
      }
    }

    // 3. Resilient Grounded Fallback Engine
    // Generates high quality, grounded response from verified HAGE documentation
    return this.generateFallbackResponse(userMessage, matchedDocs, isEscalationRequest);
  }

  private static generateFallbackResponse(
    query: string,
    docs: KnowledgeItem[],
    isEscalation: boolean
  ): AiResponseResult {
    const q = query.toLowerCase();

    // Check common patterns
    if (q.match(/^(hi|hello|hey|greetings|good morning|good evening)/)) {
      return {
        reply: `Hi! 👋 How can I help you today?`,
        suggestedActions: [],
        canEscalate: false,
        modelUsed: 'hage-knowledge-v1',
        source: 'knowledge_base'
      };
    }

    if (docs.length > 0) {
      const topDoc = docs[0];
      const reply = `${topDoc.content}\n\n*Source: ${topDoc.title}*`;
      return {
        reply,
        suggestedActions: topDoc.suggestedPrompts || [
          { label: 'Prop Firm Drawdown', prompt: 'How does daily drawdown work?' },
          { label: 'Submit Support Ticket', prompt: 'Please log this as a support ticket' }
        ],
        canEscalate: isEscalation,
        modelUsed: 'hage-knowledge-v1',
        source: 'knowledge_base'
      };
    }

    return {
      reply: `I understand you are asking about: "${query}".

To help you best:
- For **Drawdown & Challenges**, visit **Campaigns** in your dashboard.
- For **Pricing & Invoicing**, see **Dashboard > Subscription**.
- If this requires direct administrator assistance, would you like me to submit an official support ticket for you?`,
      suggestedActions: [
        { label: 'Submit Ticket', prompt: 'Please log this as a support ticket' },
        { label: 'View Pricing', prompt: 'What are the subscription plans?' }
      ],
      canEscalate: true,
      modelUsed: 'hage-knowledge-v1',
      source: 'knowledge_base'
    };
  }
}
