import express from 'express';
import {
  getGroups, createGroup, deleteGroup,
  getJoinRequests, requestJoin, resolveJoinRequest, getMyMemberships,
  getMessagesHandler, postMessage, reactToMessage, deleteMessage,
} from '../controllers/communityController';

const router = express.Router();

// Groups
router.get('/groups',       getGroups);
router.post('/groups',      createGroup);          // admin
router.delete('/groups/:id', deleteGroup);         // admin

// Join Requests
router.get('/join-requests',          getJoinRequests);    // admin
router.post('/join-requests',         requestJoin);        // user
router.patch('/join-requests/:id',    resolveJoinRequest); // admin
router.get('/my-memberships',         getMyMemberships);   // user

// Messages
router.get('/messages',              getMessagesHandler);
router.post('/messages',             postMessage);
router.post('/messages/:id/react',   reactToMessage);
router.delete('/messages/:id',       deleteMessage);

export default router;
