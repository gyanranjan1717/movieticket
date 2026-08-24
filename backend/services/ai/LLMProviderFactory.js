import GeminiProvider from './GeminiProvider.js';
import OpenAIProvider from './OpenAIProvider.js';
import AIConfig from '../../models/AIConfig.js';

/**
 * LLMProviderFactory
 * 
 * Manages registration, instantiation, and resolution of LLM providers.
 * Any new model provider (Anthropic, Mistral, Groq, Ollama, DeepSeek)
 * can simply be registered here as a subclass of BaseLLMProvider without modifying
 * the controllers or frontend API contract.
 */
export class LLMProviderFactory {
  static providers = new Map();

  /**
   * Register a new LLM provider subclass
   * @param {string} name Provider key (e.g. 'gemini', 'openai', 'claude', 'groq')
   * @param {typeof import('./BaseLLMProvider').BaseLLMProvider} ProviderClass
   */
  static registerProvider(name, ProviderClass) {
    if (!name || typeof name !== 'string') {
      throw new Error("Provider name must be a non-empty string.");
    }
    this.providers.set(name.toLowerCase(), ProviderClass);
    console.log(`[ShowTime AI] Registered LLM Provider: "${name.toLowerCase()}"`);
  }

  /**
   * Get list of registered provider names
   * @returns {string[]}
   */
  static getRegisteredProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Resolves the active provider based on database configuration or overrides
   * @param {Object} overrideConfig Optional runtime overrides
   * @returns {Promise<import('./BaseLLMProvider').BaseLLMProvider>}
   */
  static async getActiveProvider(overrideConfig = {}) {
    let dbConfig = null;
    try {
      dbConfig = await AIConfig.findOne({ configId: 'primary_ai_config' }).lean();
    } catch (e) {
      console.warn("Could not query AIConfig from DB, using defaults:", e.message);
    }

    const providerKey = (overrideConfig.provider || dbConfig?.activeProvider || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai')).toLowerCase();
    const model = overrideConfig.model || dbConfig?.activeModel || (providerKey === 'gemini' ? 'gemini-3.6-flash' : 'gpt-4o-mini');
    const temperature = typeof overrideConfig.temperature === 'number' ? overrideConfig.temperature : (dbConfig?.temperature ?? 0.7);

    const ProviderClass = this.providers.get(providerKey);
    if (!ProviderClass) {
      const fallbackClass = this.providers.get('gemini') || this.providers.get('openai');
      if (!fallbackClass) {
        throw new Error(`No valid LLM provider registered for key '${providerKey}'.`);
      }
      return new fallbackClass({ model, temperature });
    }

    return new ProviderClass({ model, temperature });
  }

  /**
   * Creates an instance for a specific provider by name
   */
  static createProvider(providerName, options = {}) {
    const key = providerName.toLowerCase();
    const ProviderClass = this.providers.get(key);
    if (!ProviderClass) {
      throw new Error(`Provider '${providerName}' is not registered.`);
    }
    return new ProviderClass(options);
  }
}

// Register built-in providers
LLMProviderFactory.registerProvider('gemini', GeminiProvider);
LLMProviderFactory.registerProvider('openai', OpenAIProvider);

export default LLMProviderFactory;
