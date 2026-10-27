import { Request, Response } from 'express';
import { AiService } from '../services/aiService';

export const chatWithAi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ message: 'A message string is required.' });
      return;
    }

    const chatHistory = Array.isArray(history)
      ? history.map((h: any) => ({
          role: h.sender === 'user' || h.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: h.text || h.content || ''
        }))
      : [];

    const result = await AiService.generateResponse(message.trim(), chatHistory);

    res.json({
      reply: result.reply,
      suggestedActions: result.suggestedActions || [],
      canEscalate: result.canEscalate || false,
      modelUsed: result.modelUsed,
      source: result.source
    });
  } catch (error) {
    console.error('AI Live Chat Controller Error:', error);
    res.status(500).json({
      reply: 'Our AI assistant is temporarily unavailable. Please visit our support page or contact support@hagetrading.com.',
      canEscalate: true
    });
  }
};
