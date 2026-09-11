import OpenAI from 'openai';
import BaseLLMProvider from './BaseLLMProvider.js';

export class OpenAIProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = "openai";
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || "gpt-4o-mini";
    this.client = null;
    this.initClient();
  }

  initClient() {
    if (this.apiKey) {
      try {
        this.client = new OpenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.error("Failed to initialize OpenAI client:", err.message);
      }
    }
  }

  validateConfig() {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  formatOpenAITools(tools) {
    if (!tools || !tools.length) return undefined;
    return tools.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
  }

  async generateResponse({ messages = [], systemPrompt, tools = [], executeTool, context = {} }) {
    if (!this.validateConfig()) {
      return {
        text: "⚠️ OpenAI API key is missing or not configured in backend environment (`OPENAI_API_KEY`). Please configure it in the Admin AI settings.",
        cards: {},
        provider: this.name,
        model: this.model
      };
    }

    const openai = this.client || new OpenAI({ apiKey: this.apiKey });
    const openAITools = this.formatOpenAITools(tools);

    const formattedMessages = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    // Prepend context if provided
    let contextAdded = false;
    messages.forEach((msg, idx) => {
      let content = msg.content;
      if (idx === messages.length - 1 && msg.role === 'user' && !contextAdded) {
        if (context.currentMovieTitle || context.userCity) {
          content = `[User Context: City=${context.userCity || 'Not specified'}, Active Movie=${context.currentMovieTitle || 'None'}, IsLoggedIn=${Boolean(context.userId)}]\n${content}`;
          contextAdded = true;
        }
      }
      formattedMessages.push({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content
      });
    });

    const collectedCards = { movies: [], shows: [], theaters: [], actions: [] };
    const toolResults = [];

    let currentMessages = [...formattedMessages];
    let turns = 0;
    let finalText = "";

    while (turns < 3) {
      turns++;
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: currentMessages,
        temperature: this.temperature,
        tools: openAITools,
        tool_choice: "auto"
      });

      const choice = response.choices[0];
      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        currentMessages.push(message);

        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch (e) {
            toolArgs = {};
          }

          let toolData = {};
          if (executeTool) {
            toolData = await executeTool(toolName, toolArgs, context);
          }

          toolResults.push({ tool: toolName, args: toolArgs, data: toolData });

          if (toolData.movies && Array.isArray(toolData.movies)) {
            collectedCards.movies.push(...toolData.movies);
          }
          if (toolData.shows && Array.isArray(toolData.shows)) {
            collectedCards.shows.push(...toolData.shows);
          }
          if (toolData.theaters && Array.isArray(toolData.theaters)) {
            collectedCards.theaters.push(...toolData.theaters);
          }
          if (toolData.booking) {
            collectedCards.booking = toolData.booking;
          }

          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolData)
          });
        }
      } else {
        finalText = message.content || "";
        break;
      }
    }

    return {
      text: finalText,
      toolResults,
      cards: {
        movies: deduplicateById(collectedCards.movies),
        shows: deduplicateById(collectedCards.shows, 'showId'),
        theaters: deduplicateById(collectedCards.theaters, 'id'),
        booking: collectedCards.booking || null
      },
      provider: this.name,
      model: this.model
    };
  }

  async ping() {
    const startTime = Date.now();
    try {
      if (!this.validateConfig()) {
        return { success: false, message: "OpenAI API key is not configured." };
      }
      const openai = this.client || new OpenAI({ apiKey: this.apiKey });
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      });
      const text = response.choices[0]?.message?.content || "";
      return {
        success: true,
        message: `OpenAI connected successfully (${this.model}): "${text.trim()}"`,
        latencyMs: Date.now() - startTime
      };
    } catch (err) {
      let msg = err.message;
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        msg = `OpenAI Quota Exceeded (429): Your OpenAI account has exhausted its free/prepaid credit balance ($0.00). Please add billing credits at https://platform.openai.com/billing or use Google Gemini.`;
      }
      return {
        success: false,
        message: msg,
        latencyMs: Date.now() - startTime
      };
    }
  }
}

function deduplicateById(arr, idKey = 'id') {
  if (!arr || !arr.length) return [];
  const seen = new Set();
  return arr.filter(item => {
    const key = item[idKey] || item._id;
    if (!key || seen.has(String(key))) return false;
    seen.add(String(key));
    return true;
  });
}

export default OpenAIProvider;
