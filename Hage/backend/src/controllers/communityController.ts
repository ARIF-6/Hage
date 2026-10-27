import { Request, Response } from 'express';
import { dbManager } from '../config/dbManager';

const MAX_MESSAGES = 1000;

/* ── Helpers ── */
function getS() { return dbManager.getStore() as any; }

function initStore() {
  const s = getS();
  if (!s.communityMessages) s.communityMessages = [];
  if (!s.communityGroups)   s.communityGroups   = [];
  if (!s.communityJoinReqs) s.communityJoinReqs = [];
}

function save() { dbManager.saveToDisk(); }

/* ════════════════════════════════════════
   GROUPS
════════════════════════════════════════ */

// GET /api/community/groups
export const getGroups = (_req: Request, res: Response) => {
  initStore();
  res.json(getS().communityGroups);
};

// POST /api/community/groups  (admin only)
export const createGroup = (req: Request, res: Response) => {
  initStore();
  const { name, description, icon, color, isPrivate } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Group name required' });

  const group = {
    id: `grp_${Date.now()}`,
    name: name.trim(),
    description: description?.trim() || '',
    icon: icon || 'Hash',
    color: color || 'text-blue-400',
    isPrivate: !!isPrivate,
    createdAt: new Date().toISOString(),
    memberCount: 0,
  };

  getS().communityGroups.push(group);
  save();
  res.status(201).json(group);
};

// DELETE /api/community/groups/:id  (admin only)
export const deleteGroup = (req: Request, res: Response) => {
  initStore();
  const { id } = req.params;
  const s = getS();
  s.communityGroups  = s.communityGroups.filter( (g: any) => g.id !== id);
  s.communityJoinReqs= s.communityJoinReqs.filter((r: any) => r.groupId !== id);
  s.communityMessages= s.communityMessages.filter((m: any) => m.roomId !== id);
  save();
  res.json({ success: true });
};

/* ════════════════════════════════════════
   JOIN REQUESTS
════════════════════════════════════════ */

// GET /api/community/join-requests  (admin)
export const getJoinRequests = (_req: Request, res: Response) => {
  initStore();
  res.json(getS().communityJoinReqs);
};

// POST /api/community/join-requests
export const requestJoin = (req: Request, res: Response) => {
  initStore();
  const { groupId, username } = req.body;
  if (!groupId || !username) return res.status(400).json({ message: 'groupId and username required' });

  const s = getS();
  const group = s.communityGroups.find((g: any) => g.id === groupId);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  const existing = s.communityJoinReqs.find(
    (r: any) => r.groupId === groupId && r.username === username
  );
  if (existing) return res.status(409).json({ message: 'Request already exists', request: existing });

  const jr = {
    id: `jr_${Date.now()}`,
    groupId,
    groupName: group.name,
    username,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    resolvedAt: null as string | null,
  };

  s.communityJoinReqs.push(jr);
  save();
  res.status(201).json(jr);
};

// PATCH /api/community/join-requests/:id  (admin)
export const resolveJoinRequest = (req: Request, res: Response) => {
  initStore();
  const { id } = req.params;
  const { action } = req.body;
  if (!['accept', 'reject'].includes(action))
    return res.status(400).json({ message: 'action must be accept or reject' });

  const s = getS();
  const jr = s.communityJoinReqs.find((r: any) => r.id === id);
  if (!jr) return res.status(404).json({ message: 'Request not found' });

  jr.status = action === 'accept' ? 'accepted' : 'rejected';
  jr.resolvedAt = new Date().toISOString();

  if (action === 'accept') {
    const group = s.communityGroups.find((g: any) => g.id === jr.groupId);
    if (group) group.memberCount = (group.memberCount || 0) + 1;
  }

  save();
  res.json(jr);
};

// GET /api/community/my-memberships?username=xxx
export const getMyMemberships = (req: Request, res: Response) => {
  initStore();
  const { username } = req.query;
  res.json(getS().communityJoinReqs.filter((r: any) => r.username === username));
};

/* ════════════════════════════════════════
   MESSAGES
════════════════════════════════════════ */

// GET /api/community/messages?room=&since=
export const getMessagesHandler = (req: Request, res: Response) => {
  initStore();
  const { room, since } = req.query;
  let msgs = getS().communityMessages;
  if (room)  msgs = msgs.filter((m: any) => m.roomId === room);
  if (since) msgs = msgs.filter((m: any) => m.timestamp > Number(since));
  res.json(msgs.slice(-200));
};

// POST /api/community/messages
export const postMessage = (req: Request, res: Response) => {
  initStore();
  const { roomId, author, authorInitial, authorColor, text } = req.body;
  if (!roomId || !author || !text?.trim())
    return res.status(400).json({ message: 'Missing required fields' });

  const s = getS();

  // For group rooms: verify membership
  const isGroup = s.communityGroups.find((g: any) => g.id === roomId);
  if (isGroup) {
    const isMember = s.communityJoinReqs.some(
      (r: any) => r.groupId === roomId && r.username === author && r.status === 'accepted'
    );
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });
  }

  const msg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    roomId,
    author,
    authorInitial: authorInitial || author[0].toUpperCase(),
    authorColor:   authorColor   || 'from-blue-500 to-indigo-600',
    text: text.trim().slice(0, 2000),
    timestamp: Date.now(),
    reactions: {} as Record<string, string[]>,
  };

  s.communityMessages.push(msg);
  if (s.communityMessages.length > MAX_MESSAGES)
    s.communityMessages = s.communityMessages.slice(-MAX_MESSAGES);

  save();
  res.status(201).json(msg);
};

// POST /api/community/messages/:id/react
export const reactToMessage = (req: Request, res: Response) => {
  initStore();
  const { id } = req.params;
  const { emoji, username } = req.body;
  if (!emoji || !username) return res.status(400).json({ message: 'Missing emoji or username' });

  const s = getS();
  const msg = s.communityMessages.find((m: any) => m.id === id);
  if (!msg) return res.status(404).json({ message: 'Message not found' });

  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const reactors: string[] = msg.reactions[emoji];
  const idx = reactors.indexOf(username);
  if (idx >= 0) reactors.splice(idx, 1); else reactors.push(username);

  save();
  res.json(msg);
};

// DELETE /api/community/messages/:id
export const deleteMessage = (req: Request, res: Response) => {
  initStore();
  const { id } = req.params;
  const { username } = req.body;
  const s = getS();
  const idx = s.communityMessages.findIndex((m: any) => m.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Message not found' });

  const msg = s.communityMessages[idx];
  const isAdmin = req.headers['x-admin'] === 'true';
  if (msg.author !== username && !isAdmin)
    return res.status(403).json({ message: 'Not authorized' });

  s.communityMessages.splice(idx, 1);
  save();
  res.json({ success: true });
};
