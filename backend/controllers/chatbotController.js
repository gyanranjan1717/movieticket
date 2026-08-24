import LLMProviderFactory from '../services/ai/LLMProviderFactory.js';
import AIConfig from '../models/AIConfig.js';
import { SYSTEM_PROMPT, TOOL_DEFINITIONS, executeToolCall } from '../services/ai/chatbotTools.js';
import jwt from 'jsonwebtoken';

/**
 * Handle incoming user chat messages
 */
export const sendMessage = async (req, res) => {
  try {
    const { messages, context = {} } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Messages array is required."
      });
    }

    // Attempt to extract userId from optional Authorization header
    let userId = context.userId || null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id || decoded.userId || decoded.sub;
      } catch (err) {
        // Token optional for public chat
      }
    }

    const enhancedContext = {
      ...context,
      userId
    };

    // Load active config from DB
    let dbConfig = await AIConfig.findOne({ configId: 'primary_ai_config' });
    if (!dbConfig) {
      dbConfig = await AIConfig.create({
        configId: 'primary_ai_config',
        activeProvider: process.env.GEMINI_API_KEY ? 'gemini' : 'openai',
        activeModel: process.env.GEMINI_API_KEY ? 'gemini-3.6-flash' : 'gpt-4o-mini',
        temperature: 0.7
      });
    } else if (dbConfig.activeModel === 'gemini-2.5-flash' || dbConfig.activeModel === 'gemini-1.5-flash') {
      dbConfig.activeModel = 'gemini-3.6-flash';
      await dbConfig.save();
    }

    if (!dbConfig.enabled) {
      return res.json({
        success: true,
        reply: {
          text: "AI Assistant is currently offline for scheduled maintenance. Please browse movies directly on ShowTime.",
          cards: {},
          provider: "offline",
          model: "none"
        }
      });
    }

    // Get active provider instance
    const provider = await LLMProviderFactory.getActiveProvider();

    // Prepare system prompt
    let fullSystemPrompt = SYSTEM_PROMPT;
    if (dbConfig.systemPromptOverride && dbConfig.systemPromptOverride.trim()) {
      fullSystemPrompt += `\n\nAdditional Admin Instructions:\n${dbConfig.systemPromptOverride}`;
    }

    // Performance Optimization: Slice to recent 6 conversation turns to prevent token bloat & high latency
    const recentMessages = messages.slice(-6);

    // Generate response with tool calling
    const aiResponse = await provider.generateResponse({
      messages: recentMessages,
      systemPrompt: fullSystemPrompt,
      tools: TOOL_DEFINITIONS,
      executeTool: executeToolCall,
      context: enhancedContext
    });

    res.json({
      success: true,
      reply: aiResponse
    });
  } catch (error) {
    console.error("Chatbot Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI response.",
      error: error.message
    });
  }
};

/**
 * Get public chatbot configuration (for frontend widget header & suggestions)
 */
export const getChatbotConfig = async (req, res) => {
  try {
    let config = await AIConfig.findOne({ configId: 'primary_ai_config' }).lean();
    if (!config) {
      config = {
        activeProvider: process.env.GEMINI_API_KEY ? 'gemini' : 'openai',
        activeModel: process.env.GEMINI_API_KEY ? 'gemini-3.6-flash' : 'gpt-4o-mini',
        enabled: true,
        welcomeMessage: "👋 Hi there! I'm your ShowTime AI Concierge. How can I assist your movie experience today?",
        suggestedPrompts: [
          "🍿 Recommend a top-rated movie for tonight",
          "🎟️ How do I book tickets & select seats?",
          "🕒 How does the 10-minute seat hold work?",
          "📍 Find theaters near me"
        ]
      };
    } else if (config.activeModel === 'gemini-2.5-flash' || config.activeModel === 'gemini-1.5-flash') {
      config.activeModel = 'gemini-3.6-flash';
    }

    res.json({
      success: true,
      config: {
        activeProvider: config.activeProvider,
        activeModel: config.activeModel,
        enabled: config.enabled,
        welcomeMessage: config.welcomeMessage,
        suggestedPrompts: config.suggestedPrompts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Get full AI settings & provider statuses
 */
export const getAIAdminSettings = async (req, res) => {
  try {
    let config = await AIConfig.findOne({ configId: 'primary_ai_config' });
    if (!config) {
      config = await AIConfig.create({
        configId: 'primary_ai_config',
        activeProvider: process.env.GEMINI_API_KEY ? 'gemini' : 'openai',
        activeModel: process.env.GEMINI_API_KEY ? 'gemini-3.6-flash' : 'gpt-4o-mini',
        temperature: 0.7
      });
    } else if (config.activeModel === 'gemini-2.5-flash' || config.activeModel === 'gemini-1.5-flash') {
      config.activeModel = 'gemini-3.6-flash';
      await config.save();
    }

    const registeredProviders = LLMProviderFactory.getRegisteredProviders();

    const providerStatus = {
      gemini: {
        hasKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
        availableModels: ["gemini-3.6-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"]
      },
      openai: {
        hasKey: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 5),
        availableModels: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]
      }
    };

    res.json({
      success: true,
      config,
      registeredProviders,
      providerStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Update AI settings (Switch provider, model, temperature, prompts, model cards)
 */
export const updateAIAdminSettings = async (req, res) => {
  try {
    const {
      activeProvider,
      activeModel,
      temperature,
      systemPromptOverride,
      enabled,
      welcomeMessage,
      suggestedPrompts,
      providerModelCards
    } = req.body;

    const registered = LLMProviderFactory.getRegisteredProviders();
    if (activeProvider && !registered.includes(activeProvider.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Provider '${activeProvider}' is not registered. Registered providers are: ${registered.join(', ')}`
      });
    }

    const cleanModel = (activeModel || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/^models\//, '');

    const updated = await AIConfig.findOneAndUpdate(
      { configId: 'primary_ai_config' },
      {
        $set: {
          activeProvider: activeProvider?.toLowerCase(),
          activeModel: cleanModel || undefined,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
          systemPromptOverride: systemPromptOverride ?? '',
          enabled: typeof enabled === 'boolean' ? enabled : true,
          welcomeMessage: welcomeMessage || undefined,
          suggestedPrompts: Array.isArray(suggestedPrompts) ? suggestedPrompts : undefined,
          providerModelCards: providerModelCards || undefined,
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: `AI configuration updated to use ${updated.activeProvider} (${updated.activeModel})`,
      config: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Test connection to an LLM provider
 */
export const testAIConnection = async (req, res) => {
  try {
    const { provider, model } = req.body;
    const targetProvider = (provider || 'gemini').toLowerCase();
    
    // Auto-clean model name format (lowercase, replace spaces with hyphens, remove models/ prefix)
    let cleanModel = (model || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/^models\//, '');
    if (!cleanModel) {
      cleanModel = targetProvider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-4o-mini';
    }

    const providerInstance = LLMProviderFactory.createProvider(targetProvider, { model: cleanModel });
    const pingResult = await providerInstance.ping();

    res.json({
      success: pingResult.success,
      result: {
        ...pingResult,
        testedModel: cleanModel
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Test connection error: ${error.message}`
    });
  }
};

/**
 * Admin: Fetch live available models directly from Google Gemini or OpenAI APIs
 */
export const getLiveProviderModels = async (req, res) => {
  try {
    const provider = (req.query.provider || 'gemini').toLowerCase();

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ success: false, message: "GEMINI_API_KEY is not configured in backend/.env" });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to fetch models from Google API");
      }

      // Filter models that support generateContent and are text/chat models
      const models = (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent') && !m.name.includes('embedding') && !m.name.includes('tts') && !m.name.includes('image') && !m.name.includes('preview-tts'))
        .map(m => {
          const id = m.name.replace(/^models\//, '');
          return {
            id,
            name: m.displayName || id,
            desc: m.description || 'Google Generative Language model'
          };
        });

      return res.json({
        success: true,
        provider: 'gemini',
        models
      });
    } else if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ success: false, message: "OPENAI_API_KEY is not configured in backend/.env" });
      }

      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey });
      const list = await client.models.list();
      const models = list.data
        .filter(m => m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3') || m.id.startsWith('chatgpt'))
        .map(m => ({
          id: m.id,
          name: m.id,
          desc: 'OpenAI Chat & Reasoning model'
        }));

      return res.json({
        success: true,
        provider: 'openai',
        models
      });
    }

    res.status(400).json({ success: false, message: `Unsupported provider: ${provider}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
