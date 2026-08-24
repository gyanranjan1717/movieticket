import { GoogleGenerativeAI } from '@google/generative-ai';
import BaseLLMProvider from './BaseLLMProvider.js';

export class GeminiProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = "gemini";
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.model = config.model || "gemini-3.6-flash";
    this.client = null;
    this.initClient();
  }

  initClient() {
    if (this.apiKey) {
      try {
        this.client = new GoogleGenerativeAI(this.apiKey);
      } catch (err) {
        console.error("Failed to initialize Google Generative AI client:", err.message);
      }
    }
  }

  validateConfig() {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  /**
   * Convert JSON schema tools to Gemini function declarations
   */
  formatGeminiTools(tools) {
    if (!tools || !tools.length) return undefined;
    return [
      {
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    ];
  }

  async generateResponse({ messages = [], systemPrompt, tools = [], executeTool, context = {} }) {
    if (!this.validateConfig()) {
      return {
        text: "⚠️ Gemini API key is missing or not configured in backend environment (`GEMINI_API_KEY`). Please configure it in the Admin AI settings.",
        cards: {},
        provider: this.name,
        model: this.model
      };
    }

    const genAI = this.client || new GoogleGenerativeAI(this.apiKey);
    const geminiTools = this.formatGeminiTools(tools);

    // Filter and map conversation history
    let rawContents = [];
    messages.forEach(msg => {
      if (msg.role === 'user' && msg.content?.trim()) {
        rawContents.push({ role: 'user', parts: [{ text: msg.content.trim() }] });
      } else if ((msg.role === 'assistant' || msg.role === 'model') && msg.content?.trim()) {
        rawContents.push({ role: 'model', parts: [{ text: msg.content.trim() }] });
      }
    });

    // Gemini strictly requires the first message in history to have role 'user'
    while (rawContents.length > 0 && rawContents[0].role === 'model') {
      rawContents.shift();
    }

    if (rawContents.length === 0) {
      return {
        text: "Hello! How can I assist you with movies, showtimes, or bookings today?",
        cards: {},
        provider: this.name,
        model: this.model
      };
    }

    // Extract the latest turn (must be the message to send)
    const latestTurn = rawContents[rawContents.length - 1];
    let latestMessage = latestTurn.parts[0].text;

    // Prepend context to the latest user message
    if (context.currentMovieTitle || context.userCity) {
      const contextPrefix = `[User Context: City=${context.userCity || 'Not specified'}, Active Movie=${context.currentMovieTitle || 'None'}, IsLoggedIn=${Boolean(context.userId)}]\n`;
      const lastUserIndex = rawContents.map(c => c.role).lastIndexOf('user');
      if (lastUserIndex !== -1) {
        rawContents[lastUserIndex].parts[0].text = contextPrefix + rawContents[lastUserIndex].parts[0].text;
      }
    }

    const generativeModel = genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: 800
      },
      tools: geminiTools
    });

    const collectedCards = { movies: [], shows: [], theaters: [], actions: [] };
    const toolResults = [];

    let currentContents = [...rawContents];
    let turns = 0;
    let finalText = "";

    while (turns < 4) {
      turns++;
      const result = await generativeModel.generateContent({
        contents: currentContents
      });
      const response = await result.response;
      const candidates = response.candidates || [];
      const firstCandidate = candidates[0];

      if (!firstCandidate || !firstCandidate.content) {
        finalText = response.text ? response.text() : "I couldn't process that request.";
        break;
      }

      // Append model turn to conversation turns
      currentContents.push(firstCandidate.content);

      // Check for function calls
      const parts = firstCandidate.content.parts || [];
      const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall);

      if (functionCalls.length > 0) {
        const functionResponseParts = [];

        for (const call of functionCalls) {
          const toolName = call.name;
          const toolArgs = call.args || {};

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

          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: { output: toolData }
            }
          });
        }

        // Add tool execution response as user role
        currentContents.push({
          role: 'user',
          parts: functionResponseParts
        });
      } else {
        // Normal text response
        const textParts = parts.filter(p => p.text).map(p => p.text);
        finalText = textParts.join('\n') || response.text();

        // Robust cleanup for internal reasoning preambles (e.g. from Gemma / thinking models)
        if (finalText) {
          finalText = finalText
            .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
            .replace(/^(The user is asking|User input|The provided User Context|Since the user)[\s\S]*?(Plan:[\s\S]*?\d+\.\s+[^\n]+(\n|$))/i, '')
            .replace(/^The user is asking[\s\S]*?\n\n/i, '')
            .replace(/^The provided User Context shows[\s\S]*?\n\n/i, '')
            .replace(/^(Plan|Thought|Thinking Process|Internal Monologue|Analysis):\s*[\s\S]*?\n\n/i, '')
            .replace(/^The `?\w+`? tool returned[\s\S]*?\n\n/i, '')
            .trim();
        }
        break;
      }
    }

    return {
      text: finalText,
      toolResults,
      cards: {
        movies: deduplicateById(collectedCards.movies),
        shows: deduplicateById(collectedCards.shows, 'showId'),
        theaters: deduplicateById(collectedCards.theaters, 'id')
      },
      provider: this.name,
      model: this.model
    };
  }

  async ping() {
    const startTime = Date.now();
    try {
      if (!this.validateConfig()) {
        return { success: false, message: "Gemini API key is not configured." };
      }
      const genAI = this.client || new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent("Hello, test connection in 2 words.");
      const text = result.response.text();
      return {
        success: true,
        message: `Gemini connected successfully (${this.model}): "${text.trim()}"`,
        latencyMs: Date.now() - startTime
      };
    } catch (err) {
      return {
        success: false,
        message: `Gemini connection failed: ${err.message}`,
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

export default GeminiProvider;
