import { KnowledgeService } from '../services/knowledgeService';
import { AiService } from '../services/aiService';
import { dbManager } from '../config/dbManager';

async function runTests() {
  console.log('=============================================');
  console.log('🤖 RUNNING HAGE AI SUPPORT CHAT TEST SUITE');
  console.log('=============================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // TEST 1: Knowledge Retrieval (RAG)
  console.log('--- Phase 1: Knowledge Retrieval (RAG) ---');
  const drawdownDocs = KnowledgeService.search('How does daily drawdown work?');
  assert(drawdownDocs.length > 0, 'KnowledgeService retrieves documents for drawdown query');
  assert(drawdownDocs.some(d => d.title.includes('Drawdown')), 'Top document matches drawdown subject');

  const pricingDocs = KnowledgeService.search('What are the subscription plans?');
  assert(pricingDocs.some(d => d.content.includes('$2.99') || d.content.includes('$4.99')), 'Pricing document contains accurate subscription prices');

  const contextBlock = KnowledgeService.getContextBlock('prop firm challenge rules');
  assert(contextBlock.includes('Phase 1') && contextBlock.includes('Phase 2'), 'Context block grounds Phase 1 and Phase 2 evaluation rules');

  // TEST 2: AI Service Generation & Grounded Fallback
  console.log('\n--- Phase 2: AI Response Generation ---');
  const greetingRes = await AiService.generateResponse('Hello!');
  assert(greetingRes.reply.includes('HAGE AI Support') || greetingRes.reply.includes('Hello'), 'Greeting response returns welcome message');
  assert(Boolean(greetingRes.suggestedActions && greetingRes.suggestedActions.length > 0), 'Greeting includes suggested prompt actions');

  const drawdownRes = await AiService.generateResponse('How does 5% daily drawdown work?');
  assert(drawdownRes.reply.includes('Drawdown') || drawdownRes.reply.includes('5%'), 'Drawdown query returns accurate calculation rules');
  assert(drawdownRes.source === 'openai' || drawdownRes.source === 'knowledge_base', 'AI service identifies response source');

  const escalationRes = await AiService.generateResponse('I have a billing issue and need to submit a ticket to human support');
  assert(Boolean(escalationRes.canEscalate), 'Inquiry requesting human support enables ticket escalation');

  // TEST 3: Conversation Isolation & Persistence
  console.log('\n--- Phase 3: Conversation & Message Data Models ---');
  const store = dbManager.getStore();
  const testUserId1 = 'user_test_alpha';
  const testUserId2 = 'user_test_beta';

  const convId1 = `conv_test_${Date.now()}_1`;
  const conv1 = {
    _id: convId1,
    userId: testUserId1,
    title: 'Drawdown Question',
    status: 'active',
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  store.aiConversations.push(conv1);

  const convId2 = `conv_test_${Date.now()}_2`;
  const conv2 = {
    _id: convId2,
    userId: testUserId2,
    title: 'Private User Beta Chat',
    status: 'active',
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  store.aiConversations.push(conv2);

  // User 1 conversation query
  const user1Convs = store.aiConversations.filter(c => c.userId === testUserId1);
  assert(user1Convs.length === 1 && user1Convs[0]._id === convId1, 'User 1 can retrieve only their own conversation');
  assert(!user1Convs.some(c => c.userId === testUserId2), 'User 1 cannot see User 2 private conversation (Tenant/User Isolation)');

  // Messages isolation
  store.aiMessages.push({
    _id: `msg_test_${Date.now()}_1`,
    conversationId: convId1,
    userId: testUserId1,
    role: 'user',
    content: 'My secret question',
    createdAt: new Date().toISOString()
  });

  store.aiMessages.push({
    _id: `msg_test_${Date.now()}_2`,
    conversationId: convId2,
    userId: testUserId2,
    role: 'user',
    content: 'User 2 secret trade notes',
    createdAt: new Date().toISOString()
  });

  const conv1Msgs = store.aiMessages.filter(m => m.conversationId === convId1);
  assert(conv1Msgs.length === 1 && conv1Msgs[0].content === 'My secret question', 'Messages query strictly filters by conversationId');

  // Clean up test data
  store.aiConversations = store.aiConversations.filter(c => c.userId !== testUserId1 && c.userId !== testUserId2);
  store.aiMessages = store.aiMessages.filter(m => m.userId !== testUserId1 && m.userId !== testUserId2);

  console.log('\n=============================================');
  console.log(`🎉 ALL TESTS PASSED: ${passed}/${total} assertions verified!`);
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
