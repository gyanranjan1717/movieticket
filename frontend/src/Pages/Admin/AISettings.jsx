import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Bot,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Server,
  Activity,
  Layers,
  HelpCircle,
  Send,
  MessageSquare,
  Plus,
  Trash2,
  Info
} from 'lucide-react';
import Loading from '../../Components/Loading';

const DEFAULT_MODEL_PRESETS = {
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
};

const AISettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [fetchingLiveModels, setFetchingLiveModels] = useState(false);
  const [liveModels, setLiveModels] = useState([]);

  const [activeProvider, setActiveProvider] = useState('gemini');
  const [activeModel, setActiveModel] = useState('gemini-3.6-flash');
  const [modelCards, setModelCards] = useState(DEFAULT_MODEL_PRESETS);

  // New Custom Model Form State
  const [customModelId, setCustomModelId] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [customModelDesc, setCustomModelDesc] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [temperature, setTemperature] = useState(0.7);
  const [enabled, setEnabled] = useState(true);
  const [systemPromptOverride, setSystemPromptOverride] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [newPromptInput, setNewPromptInput] = useState('');
  const [providerStatus, setProviderStatus] = useState({});

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/chatbot/admin/settings');
      if (data.success && data.config) {
        setActiveProvider(data.config.activeProvider || 'gemini');
        setActiveModel(data.config.activeModel || (data.config.activeProvider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-4o-mini'));
        
        if (data.config.providerModelCards && typeof data.config.providerModelCards === 'object') {
          setModelCards({
            gemini: data.config.providerModelCards.gemini?.length ? data.config.providerModelCards.gemini : DEFAULT_MODEL_PRESETS.gemini,
            openai: data.config.providerModelCards.openai?.length ? data.config.providerModelCards.openai : DEFAULT_MODEL_PRESETS.openai
          });
        }

        setTemperature(typeof data.config.temperature === 'number' ? data.config.temperature : 0.7);
        setEnabled(data.config.enabled !== false);
        setSystemPromptOverride(data.config.systemPromptOverride || '');
        setWelcomeMessage(data.config.welcomeMessage || "👋 Hi there! I'm your ShowTime AI Concierge. How can I assist your movie experience today?");
        setSuggestedPrompts(data.config.suggestedPrompts || [
          "🍿 Recommend a top-rated movie for tonight",
          "🎟️ How do I book tickets & select seats?",
          "🕒 How does the 10-minute seat hold work?",
          "📍 Find theaters near me"
        ]);
        if (data.providerStatus) {
          setProviderStatus(data.providerStatus);
        }
      }
    } catch (err) {
      console.error("Failed to load AI settings:", err);
      toast.error(err.response?.data?.message || "Failed to load AI settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleProviderSelect = (provider) => {
    setActiveProvider(provider);
    const available = modelCards[provider] || DEFAULT_MODEL_PRESETS[provider];
    if (available && available.length > 0) {
      setActiveModel(available[0].id);
    } else {
      setActiveModel(provider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-4o-mini');
    }
    setTestResult(null);
    setLiveModels([]);
  };

  const handleFetchLiveModels = async () => {
    try {
      setFetchingLiveModels(true);
      const { data } = await axios.get(`/api/chatbot/admin/live-models?provider=${activeProvider}`);
      if (data.success && Array.isArray(data.models)) {
        setLiveModels(data.models);
        toast.success(`Discovered ${data.models.length} live models from ${activeProvider.toUpperCase()} API!`);
      } else {
        toast.error("No models returned from provider API");
      }
    } catch (err) {
      console.error("Failed to fetch live models:", err);
      toast.error(err.response?.data?.message || `Failed to fetch models from ${activeProvider.toUpperCase()}`);
    } finally {
      setFetchingLiveModels(false);
    }
  };

  const handleAddNewModelCard = (idOverride, nameOverride, descOverride) => {
    const rawId = (idOverride || customModelId).trim();
    if (!rawId) {
      toast.error("Please enter a valid model identifier.");
      return;
    }

    // Auto-clean model ID (lowercase, replace spaces with hyphens, remove models/ prefix)
    const cleanId = rawId.toLowerCase().replace(/\s+/g, '-').replace(/^models\//, '');
    const cleanName = (nameOverride || customModelName).trim() || cleanId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const cleanDesc = (descOverride || customModelDesc).trim() || `${activeProvider.toUpperCase()} model for ShowTime`;

    const currentList = modelCards[activeProvider] || [];
    // Check if card already exists
    if (currentList.some(m => m.id === cleanId)) {
      setActiveModel(cleanId);
      toast.success(`Model card for '${cleanId}' already exists and is now selected!`);
      setCustomModelId('');
      setCustomModelName('');
      setCustomModelDesc('');
      setShowAddForm(false);
      return;
    }

    const newCard = { id: cleanId, name: cleanName, desc: cleanDesc };
    const updatedList = [...currentList, newCard];

    setModelCards({
      ...modelCards,
      [activeProvider]: updatedList
    });

    setActiveModel(cleanId);
    setCustomModelId('');
    setCustomModelName('');
    setCustomModelDesc('');
    setShowAddForm(false);
    toast.success(`✨ Created new model card: "${cleanName}" (${cleanId})! Remember to click 'Save Settings'.`);
  };

  const handleDeleteModelCard = (e, modelId) => {
    e.stopPropagation();
    const currentList = modelCards[activeProvider] || [];
    if (currentList.length <= 1) {
      toast.error("You must have at least one model card for each provider.");
      return;
    }

    const updatedList = currentList.filter(m => m.id !== modelId);
    setModelCards({
      ...modelCards,
      [activeProvider]: updatedList
    });

    if (activeModel === modelId) {
      setActiveModel(updatedList[0].id);
    }
    toast.success(`Removed model card for '${modelId}'`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        activeProvider,
        activeModel,
        temperature: Number(temperature),
        enabled,
        systemPromptOverride,
        welcomeMessage,
        suggestedPrompts,
        providerModelCards: modelCards
      };
      const { data } = await axios.put('/api/chatbot/admin/settings', payload);
      if (data.success) {
        toast.success(`✅ Saved! Active Model: ${activeProvider.toUpperCase()} (${activeModel})`);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error(err.response?.data?.message || "Failed to update AI settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const { data } = await axios.post('/api/chatbot/admin/test-connection', {
        provider: activeProvider,
        model: activeModel
      });
      setTestResult(data.result);
      if (data.success) {
        toast.success(`Connected to ${activeProvider.toUpperCase()} (${data.result.latencyMs}ms)`);
      } else {
        toast.error(data.result?.message || "Connection failed");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleAddPrompt = () => {
    if (!newPromptInput.trim()) return;
    setSuggestedPrompts([...suggestedPrompts, newPromptInput.trim()]);
    setNewPromptInput('');
  };

  const handleRemovePrompt = (index) => {
    setSuggestedPrompts(suggestedPrompts.filter((_, i) => i !== index));
  };

  if (loading) {
    return <Loading />;
  }

  const currentCards = modelCards[activeProvider] || DEFAULT_MODEL_PRESETS[activeProvider] || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-500 rounded-2xl border border-amber-500/30">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                AI Assistant Control Center
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-primary/20 text-primary border border-primary/30">
                  Dynamic Model Cards
                </span>
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Configure your AI engine, create new model cards in real-time, test latency, and manage website knowledge rules.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition cursor-pointer disabled:opacity-50"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Activity className="w-4 h-4 text-emerald-400" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Latency / Ping Test Result Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{testResult.message}</p>
            {testResult.testedModel && (
              <p className="text-xs text-gray-400 mt-1">
                Tested Model ID: <span className="font-mono text-white font-bold">{testResult.testedModel}</span>
              </p>
            )}
            {testResult.latencyMs && (
              <p className="text-xs text-gray-400 mt-0.5">Roundtrip Latency: <span className="text-white font-mono">{testResult.latencyMs} ms</span></p>
            )}
          </div>
        </div>
      )}

      {/* Grid: Provider Selection & Model Configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Provider Switcher */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Active LLM Provider
            </h3>

            <div className="space-y-4">
              {/* Google Gemini Card */}
              <div
                onClick={() => handleProviderSelect('gemini')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  activeProvider === 'gemini'
                    ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10'
                    : 'bg-gray-800/40 border-gray-700/60 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-lg">
                      G
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Google Gemini</h4>
                      <span className="text-xs text-gray-400">Native Multimodal & Live Tools</span>
                    </div>
                  </div>
                  {activeProvider === 'gemini' && (
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-700/40 flex items-center justify-between text-xs text-gray-400">
                  <span>API Key Status:</span>
                  <span className={`font-semibold ${providerStatus.gemini?.hasKey ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {providerStatus.gemini?.hasKey ? '✓ Active in ENV' : '⚠️ Missing GEMINI_API_KEY'}
                  </span>
                </div>
              </div>

              {/* OpenAI Card */}
              <div
                onClick={() => handleProviderSelect('openai')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  activeProvider === 'openai'
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'bg-gray-800/40 border-gray-700/60 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg">
                      AI
                    </div>
                    <div>
                      <h4 className="font-bold text-white">OpenAI</h4>
                      <span className="text-xs text-gray-400">GPT-4o & Function Calling</span>
                    </div>
                  </div>
                  {activeProvider === 'openai' && (
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-700/40 flex items-center justify-between text-xs text-gray-400">
                  <span>API Key Status:</span>
                  <span className={`font-semibold ${providerStatus.openai?.hasKey ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {providerStatus.openai?.hasKey ? '✓ Active in ENV' : '⚠️ Missing OPENAI_API_KEY'}
                  </span>
                </div>
              </div>
            </div>

            {/* Note on OpenAI Quotas */}
            {activeProvider === 'openai' && (
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  OpenAI Billing Requirement
                </p>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  OpenAI requires a funded prepaid billing balance (e.g. $5) under <b>platform.openai.com/billing</b>. Without credits, OpenAI returns <i>429 Quota Exceeded</i>.
                </p>
              </div>
            )}

            {/* Toggle Status */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">AI Assistant Status</p>
                <p className="text-xs text-gray-400">Enable or disable chatbot on user site</p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                  enabled ? 'bg-primary justify-end' : 'bg-gray-700 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Model Selection & Custom Model Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dynamic Model Cards Management */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  {activeProvider.toUpperCase()} Model Cards ({currentCards.length})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Active model: <span className="text-amber-400 font-mono font-bold">{activeModel}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFetchLiveModels}
                  disabled={fetchingLiveModels}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingLiveModels ? 'animate-spin text-primary' : 'text-primary'}`} />
                  {fetchingLiveModels ? 'Discovering...' : 'Discover Live Models'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddForm ? 'Cancel' : 'Add Model Card'}
                </button>
              </div>
            </div>

            {/* Add New Custom Model Card Form */}
            {showAddForm && (
              <div className="p-5 rounded-2xl bg-gray-950 border border-primary/40 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Create New {activeProvider.toUpperCase()} Model Card
                  </h4>
                  <span className="text-[11px] text-gray-400">Card will be added permanently</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                      Model Identifier (Exact API ID) *
                    </label>
                    <input
                      type="text"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      placeholder={activeProvider === 'gemini' ? 'e.g. gemini-3.6-flash or gemini-3.5-flash-lite' : 'e.g. gpt-4o-mini'}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                      Display Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={customModelName}
                      onChange={(e) => setCustomModelName(e.target.value)}
                      placeholder="e.g. Gemini 3.6 Flash Ultra"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Short Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={customModelDesc}
                    onChange={(e) => setCustomModelDesc(e.target.value)}
                    placeholder="e.g. Next-gen reasoning model with zero-latency response"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNewModelCard()}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                  >
                    + Create & Select Card
                  </button>
                </div>
              </div>
            )}

            {/* Model Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {currentCards.map((m) => {
                const isSelected = activeModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveModel(m.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-primary/15 border-primary shadow-lg shadow-primary/15'
                        : 'bg-gray-800/30 border-gray-700/60 hover:border-gray-600 hover:bg-gray-800/50'
                    }`}
                  >
                    {/* Delete Icon */}
                    {currentCards.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteModelCard(e, m.id)}
                        title="Remove model card"
                        className="absolute top-3 right-3 p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-white text-sm">{m.name}</h5>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{m.desc}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-700/30 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-gray-400 truncate max-w-[150px]">{m.id}</span>
                      <span className={isSelected ? 'text-primary font-bold' : 'text-gray-500'}>
                        {isSelected ? 'Active ✓' : 'Select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Discovered Models Section (from API discovery) */}
            {liveModels.length > 0 && (
              <div className="p-4 rounded-2xl bg-gray-950/80 border border-primary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Live API Discovery ({liveModels.length} Models Found)
                  </p>
                  <span className="text-[10px] text-gray-400">Click any model below to create a permanent card!</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {liveModels.map((lm) => (
                    <button
                      key={lm.id}
                      type="button"
                      onClick={() => handleAddNewModelCard(lm.id, lm.name, lm.desc)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        activeModel === lm.id
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-850'
                      }`}
                    >
                      <p className="font-bold text-xs truncate">{lm.name || lm.id}</p>
                      <p className="font-mono text-[10px] text-gray-500 truncate mt-0.5">{lm.id}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Temperature Slider */}
            <div className="pt-2 border-t border-gray-800 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300 font-medium flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-primary" />
                  Creativity / Temperature
                </span>
                <span className="text-primary font-mono font-bold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>0.0 (Precise / Factual)</span>
                <span>0.7 (Balanced / Recommended)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>
          </div>

          {/* System Prompt Customization */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Custom Admin Instructions / Knowledge Rules
            </h3>
            <p className="text-xs text-gray-400">
              Add custom instructions to guide the AI on tone, promotional campaigns, or special rules (e.g. <i>"Emphasize IMAX 3D for weekend blockbuster shows"</i>).
            </p>
            <textarea
              value={systemPromptOverride}
              onChange={(e) => setSystemPromptOverride(e.target.value)}
              rows={4}
              placeholder="e.g. Always greet user warmly, suggest popcorn combos with VIP shows, and remind them that weekend night shows sell out fast."
              className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-primary transition resize-none"
            />
          </div>

          {/* Welcome Message & Suggested Prompts */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Welcome Message & Prompt Chips
            </h3>

            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1.5">
                Greeting Message
              </label>
              <input
                type="text"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-2">
                Quick Suggestion Chips
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestedPrompts.map((prompt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-200"
                  >
                    <span>{prompt}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePrompt(idx)}
                      className="text-gray-400 hover:text-red-400 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPromptInput}
                  onChange={(e) => setNewPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPrompt()}
                  placeholder="Add a new quick suggestion chip..."
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddPrompt}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold border border-gray-700 cursor-pointer"
                >
                  Add Chip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
