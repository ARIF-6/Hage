export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  suggestedPrompts?: { label: string; prompt: string }[];
}

export const VERIFIED_HAGE_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'kb_prop_firm_rules',
    title: 'Prop Firm Evaluation & Challenge Rules',
    category: 'prop_firm_rules',
    tags: ['drawdown', 'daily loss', 'max loss', 'phase 1', 'phase 2', 'funded', 'rules', 'challenge', 'target'],
    content: `### Prop Firm Evaluation Rules
1. **Phase 1 Evaluation**:
   - Profit Target: Typically 8% to 10% gain on initial balance.
   - Maximum Daily Drawdown: 5% of starting day balance (resets daily at 00:00 UTC).
   - Maximum Overall Drawdown: 10% of starting balance.
   - Minimum Trading Days: 5 days (tracked automatically in HAGE Calendar).

2. **Phase 2 Verification**:
   - Profit Target: Typically 5% gain on initial balance.
   - Drawdown Rules: Same 5% daily / 10% overall drawdown limits apply.

3. **Funded Trader Stage**:
   - No profit target required; trade consistently to request bi-weekly or monthly payouts.
   - Profit Split: 80% to 90% payout split to the trader.
   - Drawdown: Strictly monitored to safeguard the funded account.`,
    suggestedPrompts: [
      { label: 'Drawdown Calculation', prompt: 'How does daily drawdown calculation work?' },
      { label: 'Passing Certificate', prompt: 'How do I get my challenge passing certificate?' }
    ]
  },
  {
    id: 'kb_drawdown_calculation',
    title: 'Daily and Overall Drawdown Calculations',
    category: 'risk_management',
    tags: ['drawdown', 'calculation', 'daily drawdown', 'overall drawdown', 'high water mark', 'equity', 'balance'],
    content: `### Drawdown Calculation Details
1. **Daily Drawdown (5%)**:
   - Formula: Permissible Daily Loss = Starting Day Balance × 5%.
   - Example: If your account starts the trading day at $100,000, your equity must not fall below $95,000 before 00:00 UTC.
   - Notice: Floating open losses count towards daily drawdown! Close trades before drawdown breaches.

2. **Maximum Overall Drawdown (10%)**:
   - Calculated from initial starting capital or high-water mark depending on the firm.
   - On a $100,000 account, equity must not fall below $90,000 at any time.

3. **HAGE Drawdown Monitor**:
   - HAGE calculates your remaining drawdown buffer in real-time on every trade log.
   - Visual safety gauges turn amber at 50% drawdown and red at 80% warning limit.`,
    suggestedPrompts: [
      { label: 'Configure Drawdown', prompt: 'Where do I configure drawdown percentage for my account?' },
      { label: 'Risk per Trade', prompt: 'What is the recommended risk percentage per trade?' }
    ]
  },
  {
    id: 'kb_subscription_plans',
    title: 'Subscription Tiers & Membership Pricing',
    category: 'pricing',
    tags: ['pricing', 'subscription', 'plans', 'cost', 'upgrade', 'starter', 'pro', 'premium', 'crypto', 'payment'],
    content: `### HAGE Membership Plans & Pricing
- **Starter Plan ($2.99 / month)**:
  - 1 Trading Account
  - Up to 100 Trades/month
  - Standard Journal, Notes, and Equity Curve
  - Essential Drawdown Tracking

- **Pro Plan ($4.99 / month) — Most Popular**:
  - Up to 3 Trading Accounts
  - Unlimited Trades logged
  - Advanced Analytics (Session Edge, Directional Bias, Win/Loss Ratio)
  - Full Challenge Tracking (Phase 1, Phase 2, and Automated Passing Certificates)
  - Performance Calendar

- **Premium Plan ($9.99 / month) — All Access**:
  - Unlimited Trading Accounts & Unlimited Trades
  - Everything in Pro
  - Future MetaTrader 5 (MT5) Direct Bridge
  - AI Multi-Factor HAGE Score Analysis & Radar Insights
  - Priority 24/7 Support Escalation

*Payment Methods*: We accept secure instant cryptocurrency payments (USDT via NOWPayments) and card checkouts.`,
    suggestedPrompts: [
      { label: 'Upgrade Plan', prompt: 'How do I upgrade to Pro or Premium?' },
      { label: 'Accepted Payments', prompt: 'What payment methods do you support?' }
    ]
  },
  {
    id: 'kb_trade_journaling',
    title: 'Trade Journaling & Performance Metrics',
    category: 'journaling',
    tags: ['journal', 'trades', 'log trade', 'pnl', 'win rate', 'hage score', 'calendar', 'csv import'],
    content: `### Trade Journaling in HAGE
1. **Logging a Trade**:
   - Navigate to **Trades** or **Journal** from the dashboard sidebar.
   - Click **+ Add Trade** (or use fast trade log).
   - Enter symbol (e.g. EURUSD, NAS100, XAUUSD), direction (Long/Short), entry price, exit price, lot size, net P&L, setup tag, and psychological emotions.
   - Attach charts and screenshots directly for post-trade reviews.

2. **Trading Calendar**:
   - Visual monthly performance view where days are colored green for net profit and red for net loss.
   - Click any trading day to view specific trades taken and individual execution notes.

3. **Multi-Factor HAGE Score**:
   - Assesses your performance across 6 institutional pillars: Win Rate, Profit Factor, Average Win/Loss, Consistency, Max Drawdown, and Recovery Factor.`,
    suggestedPrompts: [
      { label: 'Import CSV Trades', prompt: 'Can I import my trades from CSV?' },
      { label: 'HAGE Radar Score', prompt: 'How is the HAGE Radar Score calculated?' }
    ]
  },
  {
    id: 'kb_account_management',
    title: 'Account Configuration & Challenge Campaigns',
    category: 'accounts',
    tags: ['account', 'connect account', 'campaign', 'prop firm', 'broker', 'balance', 'phase'],
    content: `### Connecting and Managing Accounts
1. **Adding an Account**:
   - Go to **Campaigns** from the dashboard sidebar.
   - Click **+ Connect Account**.
   - Select your prop firm (FTMO, FundedNext, The5ers, Funding Pips, etc.) or Personal Broker.
   - Set account size ($10k, $25k, $50k, $100k, $200k) and phase (Phase 1, Phase 2, Funded).
   - Enter custom target and drawdown parameters if your firm uses special rules.

2. **Automated Passing Certificates**:
   - When your realized net return hits the evaluation target, HAGE automatically triggers an official passing certificate.
   - Download or share your certificate with funded prop firms.`,
    suggestedPrompts: [
      { label: 'Phase 2 Setup', prompt: 'How do I switch from Phase 1 to Phase 2?' },
      { label: 'Multiple Accounts', prompt: 'How many accounts can I connect?' }
    ]
  },
  {
    id: 'kb_support_and_tickets',
    title: 'Technical Support & Human Escalation',
    category: 'support',
    tags: ['support', 'contact', 'human', 'ticket', 'bug', 'help', 'email', 'issue'],
    content: `### Customer Support & Assistance
- **AI Live Chat**: Available 24/7 directly within the web app for instant answers and rule calculations.
- **Support Tickets**: If you encounter an account issue or payment query that requires administrator intervention, simply ask this AI assistant: *"Please submit a support ticket"*, and it will automatically escalate your inquiry to the admin team.
- **Direct Email**: You can also reach human support directly at **support@hagetrading.com**.
- **Contact Page**: Fill out the official form at **hagetrading.com/contact** anytime.`,
    suggestedPrompts: [
      { label: 'Submit Ticket', prompt: 'Please log this as an official support ticket' },
      { label: 'Contact Human Support', prompt: 'How do I speak with a human support agent?' }
    ]
  }
];

export class KnowledgeService {
  public static search(query: string, limit = 3): KnowledgeItem[] {
    const q = query.toLowerCase().trim();
    const queryTokens = q.split(/\s+/).filter(t => t.length > 2);

    const scored = VERIFIED_HAGE_KNOWLEDGE.map(item => {
      let score = 0;
      const text = `${item.title} ${item.tags.join(' ')} ${item.content}`.toLowerCase();

      // Exact phrase match
      if (text.includes(q)) {
        score += 15;
      }

      // Tag match
      item.tags.forEach(tag => {
        if (q.includes(tag.toLowerCase())) {
          score += 10;
        }
      });

      // Token matches
      queryTokens.forEach(token => {
        if (item.title.toLowerCase().includes(token)) score += 5;
        if (text.includes(token)) score += 2;
      });

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Return items that matched or default top relevance
    const relevant = scored.filter(s => s.score > 0).map(s => s.item);
    return relevant.length > 0 ? relevant.slice(0, limit) : VERIFIED_HAGE_KNOWLEDGE.slice(0, limit);
  }

  public static getContextBlock(query: string): string {
    const items = this.search(query, 2);
    if (!items.length) return '';
    return items
      .map(doc => `[DOCUMENT: ${doc.title}]\n${doc.content}`)
      .join('\n\n---\n\n');
  }
}
