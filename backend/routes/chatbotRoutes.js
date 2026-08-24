import express from 'express';
import {
  sendMessage,
  getChatbotConfig,
  getAIAdminSettings,
  updateAIAdminSettings,
  testAIConnection,
  getLiveProviderModels
} from '../controllers/chatbotController.js';
import { protectAdmin } from '../middleware/auth.js';

const chatbotRouter = express.Router();

/**
 * Public Chat Endpoints
 */
chatbotRouter.post('/message', sendMessage);
chatbotRouter.get('/config', getChatbotConfig);

/**
 * Admin AI Management Endpoints
 */
chatbotRouter.get('/admin/settings', protectAdmin, getAIAdminSettings);
chatbotRouter.put('/admin/settings', protectAdmin, updateAIAdminSettings);
chatbotRouter.post('/admin/test-connection', protectAdmin, testAIConnection);
chatbotRouter.get('/admin/live-models', protectAdmin, getLiveProviderModels);

export default chatbotRouter;
