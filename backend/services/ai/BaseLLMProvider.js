/**
 * BaseLLMProvider (Abstract Parent Class)
 * 
 * Defines the contract that all LLM provider subclasses (Gemini, OpenAI, Claude, etc.)
 * must implement. This ensures the chat controller and frontend remain decoupled
 * from specific vendor APIs.
 */
export class BaseLLMProvider {
  /**
   * @param {Object} config Provider configuration (apiKey, model, temperature, etc.)
   */
  constructor(config = {}) {
    if (new.target === BaseLLMProvider) {
      throw new TypeError("Cannot construct BaseLLMProvider instances directly. Use a concrete subclass.");
    }
    this.name = "base";
    this.config = config;
    this.apiKey = config.apiKey || null;
    this.model = config.model || "default";
    this.temperature = typeof config.temperature === 'number' ? config.temperature : 0.7;
  }

  /**
   * Validates provider credentials and settings
   * @returns {boolean}
   */
  validateConfig() {
    throw new Error("Method 'validateConfig()' must be implemented by subclass.");
  }

  /**
   * Generates a conversational AI response with tool-calling capabilities.
   * 
   * @param {Object} params
   * @param {Array<{role: string, content: string}>} params.messages Conversation history
   * @param {string} params.systemPrompt System instructions and knowledge
   * @param {Array<Object>} params.tools Tool definitions available to the model
   * @param {Function} params.executeTool Callback to execute tools by name
   * @param {Object} params.context Additional context (user, city, active movie)
   * @returns {Promise<{
   *   text: string,
   *   toolResults: Array<any>,
   *   cards: { movies?: Array<any>, shows?: Array<any>, actions?: Array<any> },
   *   provider: string,
   *   model: string
   * }>}
   */
  async generateResponse({ messages, systemPrompt, tools, executeTool, context }) {
    throw new Error("Method 'generateResponse()' must be implemented by subclass.");
  }

  /**
   * Tests connectivity to the LLM API
   * @returns {Promise<{success: boolean, message: string, latencyMs?: number}>}
   */
  async ping() {
    throw new Error("Method 'ping()' must be implemented by subclass.");
  }
}

export default BaseLLMProvider;
