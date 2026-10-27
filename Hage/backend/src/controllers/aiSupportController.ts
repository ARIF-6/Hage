import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { dbManager } from '../config/dbManager';
import { AiService } from '../services/aiService';
import { VERIFIED_HAGE_KNOWLEDGE } from '../services/knowledgeService';
import Conversation from '../models/Conversation';
import Message from '../models/Message';

// Simple in-memory rate limiter per user/IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id || req.body.anonymousId || `guest_${Date.now()}`;
    const { title = 'New Conversation' } = req.body;

    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const conversationData = {
      _id: convId,
      userId,
      title,
      status: 'active',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Initial welcome message
    const welcomeMsgId = `msg_${Date.now()}_welcome`;
    const initialMessage = {
      _id: welcomeMsgId,
      conversationId: convId,
      userId,
      role: 'assistant',
      content: `Hi! 👋 How can I help you today?`,
      suggestedActions: [],
      canEscalate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store in Mongo if connected, else in dbManager
    if (dbManager.getIsMongoConnected()) {
      try {
        await Conversation.create(conversationData);
        await Message.create(initialMessage);
      } catch (err) {
        console.warn('Mongo save failed, storing in local DB store:', err);
      }
    }

    const store = dbManager.getStore();
    store.aiConversations.unshift(conversationData);
    store.aiMessages.push(initialMessage);
    dbManager.saveToDisk();

    res.status(201).json({
      conversation: conversationData,
      initialMessage
    });
  } catch (error) {
    console.error('Create Conversation Error:', error);
    res.status(500).json({ message: 'Failed to initialize conversation' });
  }
};

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id || req.query.anonymousId as string;
    if (!userId) {
      res.status(400).json({ message: 'User identification required' });
      return;
    }

    const store = dbManager.getStore();
    const userConvs = store.aiConversations
      .filter((c: any) => c.userId === userId && c.status !== 'archived')
      .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    res.json(userConvs);
  } catch (error) {
    console.error('Get Conversations Error:', error);
    res.status(500).json({ message: 'Failed to retrieve conversation history' });
  }
};

export const getConversationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.query.anonymousId as string;
    const store = dbManager.getStore();

    const conv = store.aiConversations.find((c: any) => c._id === id);
    if (!conv) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    // Verify ownership security
    if (userId && conv.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Access denied to this conversation' });
      return;
    }

    const messages = store.aiMessages
      .filter((m: any) => m.conversationId === id)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json({ conversation: conv, messages });
  } catch (error) {
    console.error('Get Conversation By ID Error:', error);
    res.status(500).json({ message: 'Failed to load conversation details' });
  }
};

export const updateConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;
    const userId = req.user?._id || req.body.anonymousId;
    const store = dbManager.getStore();

    const conv = store.aiConversations.find((c: any) => c._id === id);
    if (!conv) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (userId && conv.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    if (title !== undefined) conv.title = String(title).slice(0, 100);
    if (status !== undefined) conv.status = status;
    conv.updatedAt = new Date().toISOString();

    dbManager.saveToDisk();
    res.json(conv);
  } catch (error) {
    console.error('Update Conversation Error:', error);
    res.status(500).json({ message: 'Failed to update conversation' });
  }
};

export const deleteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.query.anonymousId as string;
    const store = dbManager.getStore();

    const convIndex = store.aiConversations.findIndex((c: any) => c._id === id);
    if (convIndex === -1) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    const conv = store.aiConversations[convIndex];
    if (userId && conv.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Remove conversation and associated messages
    store.aiConversations.splice(convIndex, 1);
    store.aiMessages = store.aiMessages.filter((m: any) => m.conversationId !== id);
    dbManager.saveToDisk();

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete Conversation Error:', error);
    res.status(500).json({ message: 'Failed to delete conversation' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { content, anonymousId } = req.body;
    const userId = req.user?._id || anonymousId || 'guest_user';

    // 1. Validation & Rate Limiting
    const rateLimitKey = `ai_ratelimit_${userId}`;
    const maxRate = parseInt(process.env.AI_SUPPORT_RATE_LIMIT || '30', 10);
    if (!checkRateLimit(rateLimitKey, maxRate, 60000)) {
      res.status(429).json({ message: 'Rate limit exceeded. Please wait a moment before sending more messages.' });
      return;
    }

    const maxMsgLength = parseInt(process.env.AI_SUPPORT_MAX_MESSAGE_LENGTH || '2000', 10);
    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ message: 'Message content is required.' });
      return;
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > maxMsgLength) {
      res.status(400).json({ message: `Message exceeds maximum allowed length of ${maxMsgLength} characters.` });
      return;
    }

    const store = dbManager.getStore();
    let conv = store.aiConversations.find((c: any) => c._id === conversationId);

    // Auto-create conversation if it doesn't exist
    if (!conv) {
      conv = {
        _id: conversationId,
        userId,
        title: trimmedContent.slice(0, 45) + (trimmedContent.length > 45 ? '...' : ''),
        status: 'active',
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      store.aiConversations.unshift(conv);
    } else {
      // If it still has the default title, update title from the first prompt
      if (conv.title === 'New Conversation' || !conv.title) {
        conv.title = trimmedContent.slice(0, 45) + (trimmedContent.length > 45 ? '...' : '');
      }
      conv.lastMessageAt = new Date().toISOString();
      conv.updatedAt = new Date().toISOString();
    }

    // 2. Persist User Message
    const userMsgId = `msg_${Date.now()}_u`;
    const userMsg = {
      _id: userMsgId,
      conversationId,
      userId,
      role: 'user',
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.aiMessages.push(userMsg);

    // 3. Assemble Sliding Context History
    const conversationHistory = store.aiMessages
      .filter((m: any) => m.conversationId === conversationId)
      .slice(-8)
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));

    // 4. Generate AI Grounded Response
    const aiResult = await AiService.generateResponse(trimmedContent, conversationHistory, {
      name: req.user?.name,
      email: req.user?.email
    });

    // 5. Persist Assistant Message
    const assistantMsgId = `msg_${Date.now()}_a`;
    const assistantMsg = {
      _id: assistantMsgId,
      conversationId,
      userId,
      role: 'assistant',
      content: aiResult.reply,
      suggestedActions: aiResult.suggestedActions || [],
      canEscalate: aiResult.canEscalate || false,
      metadata: {
        model: aiResult.modelUsed,
        source: aiResult.source
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.aiMessages.push(assistantMsg);

    dbManager.saveToDisk();

    res.status(200).json({
      userMessage: userMsg,
      assistantMessage: assistantMsg
    });
  } catch (error: any) {
    console.error('Send Message Error:', error);
    res.status(500).json({ message: 'An error occurred while generating AI response.' });
  }
};

export const submitFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { messageId, feedback } = req.body; // feedback: 'helpful' | 'unhelpful'
    const store = dbManager.getStore();

    const msg = store.aiMessages.find((m: any) => m._id === messageId && m.conversationId === conversationId);
    if (!msg) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    msg.feedback = feedback;
    msg.updatedAt = new Date().toISOString();
    dbManager.saveToDisk();

    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    console.error('Submit Feedback Error:', error);
    res.status(500).json({ message: 'Failed to record feedback' });
  }
};

export const escalateToTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { inquiry, email } = req.body;
    const store = dbManager.getStore();

    const userEmail = email || req.user?.email || 'unregistered_trader';
    const userName = req.user?.name || 'Live Chat Visitor';

    const newTicket = {
      _id: 'iss_' + Date.now(),
      user: req.user?._id || 'chat_user_' + Date.now(),
      userName,
      userEmail,
      title: `AI Chat Escalation: ${(inquiry || 'User Inquiry').slice(0, 50)}...`,
      description: `User inquiry via AI Support Chat (Conversation ID: ${conversationId}):\n\n"${inquiry || 'Inquiry details'}"\n\nSubmitted automatically from chat session.`,
      category: 'Support Ticket',
      date: new Date().toISOString(),
      status: 'Open',
      adminNotes: 'Escalated automatically via AI Support Chat interface.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.supportIssues.unshift(newTicket);
    dbManager.saveToDisk();

    res.status(201).json({
      success: true,
      ticket: newTicket,
      message: 'Your inquiry has been escalated directly to our senior support team.'
    });
  } catch (error) {
    console.error('Escalate Ticket Error:', error);
    res.status(500).json({ message: 'Failed to escalate ticket' });
  }
};

export const getKnowledgeBase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      count: VERIFIED_HAGE_KNOWLEDGE.length,
      categories: ['prop_firm_rules', 'pricing', 'journaling', 'risk_management', 'accounts', 'support'],
      documents: VERIFIED_HAGE_KNOWLEDGE
    });
  } catch (error) {
    console.error('Get Knowledge Base Error:', error);
    res.status(500).json({ message: 'Failed to retrieve knowledge base' });
  }
};
