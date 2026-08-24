import mongoose from 'mongoose';

const aiConfigSchema = new mongoose.Schema({
  configId: {
    type: String,
    required: true,
    unique: true,
    default: 'primary_ai_config'
  },
  activeProvider: {
    type: String,
    enum: ['gemini', 'openai'],
    default: 'gemini',
    required: true
  },
  activeModel: {
    type: String,
    default: 'gemini-3.6-flash'
  },
  temperature: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.7
  },
  systemPromptOverride: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true
  },
  welcomeMessage: {
    type: String,
    default: "👋 Hi there! I'm your ShowTime AI Concierge. How can I assist your movie experience today?"
  },
  suggestedPrompts: {
    type: [String],
    default: [
      "🍿 Recommend a top-rated movie for tonight",
      "🎟️ How do I book tickets & select seats?",
      "🕒 How does the 10-minute seat hold work?",
      "📍 Find theaters near me"
    ]
  },
  providerModelCards: {
    type: Object,
    default: {
      gemini: [
        { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', desc: 'Ultra fast, multi-turn reasoning with live tools (Recommended)' },
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', desc: 'Lightweight, ultra-low latency flash model' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Standard multimodality and function calling' }
      ],
      openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Fast, cost-efficient, state-of-the-art vision & function calling' },
        { id: 'gpt-4o', name: 'GPT-4o', desc: 'Flagship OpenAI model with maximum reasoning capacity' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Legacy fast conversational model' }
      ]
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const AIConfig = mongoose.models.AIConfig || mongoose.model('AIConfig', aiConfigSchema);

export default AIConfig;
