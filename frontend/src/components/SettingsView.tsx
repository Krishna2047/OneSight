"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Settings,
  Cpu,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Lock,
  Globe,
  Sliders,
  Check,
  Bot,
  ExternalLink,
  ShieldAlert,
  Play,
  Brain,
  Search,
  Plus,
  Trash2,
  Tag,
  ShieldCheck,
  Database,
  Layers,
  Sparkles,
  Filter,
  X,
  HelpCircle
} from "lucide-react";

interface SettingsViewProps {
  tenantId?: string;
  onNavigateToCopilot?: () => void;
}

export function SettingsView({ tenantId = "tenant-acme", onNavigateToCopilot }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<"engine" | "memory">("engine");

  // AI Provider config states
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState<string>("ollama");

  // Form states
  const [ollamaModel, setOllamaModel] = useState<string>("llama3.1");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>("http://localhost:11434");
  const [groqModel, setGroqModel] = useState<string>("openai/gpt-oss-120b");
  const [groqApiKey, setGroqApiKey] = useState<string>("");

  // Test benchmark states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "SUCCESS" | "ERROR";
    provider: string;
    model?: string;
    latency_ms?: number;
    reply?: string;
    error?: string;
  } | null>(null);

  // Saving states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Mem0 Agent Memory States
  // -------------------------------------------------------------------------
  const [memories, setMemories] = useState<any[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [memorySearchResults, setMemorySearchResults] = useState<any[] | null>(null);
  const [searchingMemory, setSearchingMemory] = useState(false);
  const [memoryCategoryFilter, setMemoryCategoryFilter] = useState("ALL");

  // New Memory Form
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("FINOPS_RULE");
  const [newCategory, setNewCategory] = useState("GENERAL");
  const [addingMemory, setAddingMemory] = useState(false);
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await api.getAIConfig(tenantId);
      setConfig(res);
      setActiveProvider(res.active_provider || "ollama");

      if (res.providers?.ollama) {
        setOllamaModel(res.providers.ollama.current_model || "llama3.1");
        setOllamaBaseUrl(res.providers.ollama.base_url || "http://localhost:11434");
      }
      if (res.providers?.groq) {
        setGroqModel(res.providers.groq.current_model || "openai/gpt-oss-120b");
      }
    } catch (err) {
      console.error("Failed to load AI config", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMemories = async () => {
    setMemoryLoading(true);
    try {
      const data = await api.getAgentMemories(tenantId, memoryCategoryFilter);
      setMemories(data);
    } catch (e) {
      console.error("Failed to load agent memories", e);
    } finally {
      setMemoryLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadMemories();
  }, [tenantId]);

  useEffect(() => {
    if (activeTab === "memory") {
      loadMemories();
    }
  }, [activeTab, memoryCategoryFilter]);

  const handleTestConnection = async (provider: string, model: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testAIProvider({ provider, model }, tenantId);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        status: "ERROR",
        provider,
        error: err.message || "Failed to reach AI provider",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(null);
    try {
      const payload: any = {
        active_provider: activeProvider,
        ollama_model: ollamaModel,
        ollama_base_url: ollamaBaseUrl,
        groq_model: groqModel,
      };
      if (groqApiKey.trim()) {
        payload.groq_api_key = groqApiKey.trim();
      }

      await api.updateAIConfig(payload, tenantId);
      setSaveSuccess(`Active AI Engine updated to ${activeProvider.toUpperCase()} (${activeProvider === "ollama" ? ollamaModel : groqModel}).`);
      await loadConfig();
    } catch (err: any) {
      alert("Error saving settings: " + err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveSuccess(null), 5000);
    }
  };

  const handleSearchMemory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!memorySearchQuery.trim()) {
      setMemorySearchResults(null);
      return;
    }
    setSearchingMemory(true);
    try {
      const res = await api.searchAgentMemories(memorySearchQuery.trim(), tenantId);
      setMemorySearchResults(res);
    } catch (e) {
      console.error("Semantic search failed", e);
    } finally {
      setSearchingMemory(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setAddingMemory(true);
    try {
      await api.addAgentMemory({
        content: newContent.trim(),
        memory_type: newType,
        category: newCategory
      }, tenantId);
      setNewContent("");
      setMemoryMessage("FinOps policy committed to Mem0 memory successfully.");
      setTimeout(() => setMemoryMessage(null), 4000);
      await loadMemories();
    } catch (e: any) {
      alert("Error adding memory: " + e.message);
    } finally {
      setAddingMemory(false);
    }
  };

  const handleDeleteMemory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    try {
      await api.deleteAgentMemory(id, tenantId);
      await loadMemories();
      if (memorySearchResults) {
        setMemorySearchResults(prev => prev ? prev.filter(m => m.id !== id) : null);
      }
    } catch (e: any) {
      alert("Error deleting memory: " + e.message);
    }
  };

  const handleClearMemories = async () => {
    if (!confirm("Are you sure you want to clear all agent memories for this organization?")) return;
    try {
      await api.clearAgentMemories(tenantId);
      await loadMemories();
      setMemorySearchResults(null);
    } catch (e: any) {
      alert("Error clearing memories: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500">Loading AI Engine & System configuration...</p>
      </div>
    );
  }

  const ollama = config?.providers?.ollama;
  const groq = config?.providers?.groq;

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  AI Engine & Agent Memory
                </h2>
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Cpu className="w-3 h-3 text-indigo-600" />
                  <span>FinOps Copilot Core</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure inference providers (Ollama / Groq) and manage persistent tenant memory (Mem0 Layer).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={activeTab === "engine" ? loadConfig : loadMemories}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          {activeTab === "engine" && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save & Apply</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveSuccess}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("engine")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "engine"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>AI Inference Engine</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("memory");
            loadMemories();
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "memory"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>Agent Memory (Mem0)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "memory" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
          }`}>
            {memories.length}
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: AI INFERENCE ENGINE                                          */}
      {/* =================================================================== */}
      {activeTab === "engine" && (
        <div className="space-y-6">
          {/* AI Provider Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Local Ollama */}
            <div
              onClick={() => setActiveProvider("ollama")}
              className={`p-6 rounded-2xl border transition-all cursor-pointer relative bg-white ${
                activeProvider === "ollama"
                  ? "ring-2 ring-indigo-500 border-indigo-300 shadow-sm"
                  : "border-slate-200/90 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl">
                    🦙
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">Ollama (Local Open Source)</h3>
                      {activeProvider === "ollama" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      100% Free, Private & Offline Inference on Windows
                    </p>
                  </div>
                </div>

                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    activeProvider === "ollama"
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300"
                  }`}
                >
                  {activeProvider === "ollama" && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
              </div>

              <div className="mt-5 space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Local Ollama Model
                  </label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3.1"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Installed: <code>llama3.1:latest</code> (4.9 GB).
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ollama Base URL
                  </label>
                  <input
                    type="text"
                    value={ollamaBaseUrl}
                    onChange={(e) => setOllamaBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        ollama?.status === "CONNECTED" ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                    />
                    <span className="text-[11px] font-medium text-slate-600">
                      {ollama?.status === "CONNECTED" ? "Ollama Service Reachable" : "Host Offline or Standby"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestConnection("ollama", ollamaModel);
                    }}
                    disabled={testing}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3 text-indigo-600" />
                    <span>Test Model</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Groq Cloud */}
            <div
              onClick={() => setActiveProvider("groq")}
              className={`p-6 rounded-2xl border transition-all cursor-pointer relative bg-white ${
                activeProvider === "groq"
                  ? "ring-2 ring-indigo-500 border-indigo-300 shadow-sm"
                  : "border-slate-200/90 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">Groq Cloud (Fast LPUs)</h3>
                      {activeProvider === "groq" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sub-second ultra-fast cloud reasoning (500+ tokens/sec)
                    </p>
                  </div>
                </div>

                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    activeProvider === "groq"
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300"
                  }`}
                >
                  {activeProvider === "groq" && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
              </div>

              <div className="mt-5 space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Groq Model
                  </label>
                  <select
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-mono"
                  >
                    <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Recommended)</option>
                    <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (Fast Reasoning)</option>
                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                    <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Groq API Key
                  </label>
                  <input
                    type="password"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder={groq?.configured ? "••••••••••••••••••••••••" : "gsk_..."}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        groq?.configured ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="text-[11px] font-medium text-slate-600">
                      {groq?.configured ? "API Key Configured" : "API Key Missing"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestConnection("groq", groqModel);
                      }}
                      disabled={testing}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer flex items-center space-x-1"
                    >
                      <Play className="w-3 h-3 text-orange-600" />
                      <span>Test Cloud</span>
                    </button>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-600 hover:underline flex items-center space-x-1"
                    >
                      <span>Get Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Benchmark Result Box */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
                testResult.status === "SUCCESS"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {testResult.status === "SUCCESS" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">
                  {testResult.status === "SUCCESS" ? "Connection Benchmark Verified" : "Connection Failed"}
                </div>
                {testResult.status === "SUCCESS" ? (
                  <p className="text-[11px] leading-relaxed">
                    Successfully contacted <strong>{testResult.provider.toUpperCase()}</strong> using model{" "}
                    <code>{testResult.model}</code> in <strong>{testResult.latency_ms} ms</strong>.
                    <br />
                    <span className="italic">Sample reply: &ldquo;{testResult.reply}&rdquo;</span>
                  </p>
                ) : (
                  <p className="text-[11px] leading-relaxed">
                    Error: {testResult.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Interactive Copilot Quick Action */}
          {onNavigateToCopilot && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Ready to test in AI Copilot?
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Active provider is {activeProvider.toUpperCase()} ({activeProvider === "ollama" ? ollamaModel : groqModel}).
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateToCopilot}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Open AI Copilot
              </button>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: AGENT MEMORY (MEM0 ARCHITECTURE)                             */}
      {/* =================================================================== */}
      {activeTab === "memory" && (
        <div className="space-y-6">
          {/* Multi-Tenant Mem0 Architecture Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold tracking-tight">Mem0 Agent Memory Layer</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Multi-Tenant Isolated
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Persistent episodic memory for your FinOps team. Remembers resource exemptions (e.g. disaster recovery volumes), budget caps, and team policies across sessions.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Active Rules</div>
                  <div className="text-base font-extrabold text-white">{memories.length}</div>
                </div>
                <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Tenant Scope</div>
                  <div className="text-xs font-mono font-bold text-indigo-200">{tenantId}</div>
                </div>
              </div>
            </div>

            {/* Architecture Fallback Badges */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
              <span className="font-semibold text-slate-400">Embedding Engine Pipeline:</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 font-mono text-[10px] text-indigo-200">
                1. Ollama (nomic-embed-text)
              </span>
              <span>➔</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 font-mono text-[10px] text-indigo-200">
                2. Cloud Embeddings (OpenAI / Gemini)
              </span>
              <span>➔</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 font-mono text-[10px] text-emerald-300 font-bold">
                3. Hybrid CPU Dense Vectorizer (Guaranteed Fallback)
              </span>
            </div>
          </div>

          {memoryMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{memoryMessage}</span>
            </div>
          )}

          {/* Semantic Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Test Semantic Vector Search
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Calculates cosine distance against stored embeddings
              </span>
            </div>

            <form onSubmit={handleSearchMemory} className="flex gap-2">
              <input
                type="text"
                value={memorySearchQuery}
                onChange={(e) => setMemorySearchQuery(e.target.value)}
                placeholder="Search memories (e.g. 'disaster recovery standby', 'monthly spend ceiling', 'ec2 savings')..."
                className="flex-1 px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              />
              <button
                type="submit"
                disabled={searchingMemory}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                {searchingMemory ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Semantic Search</span>
              </button>
              {memorySearchResults && (
                <button
                  type="button"
                  onClick={() => {
                    setMemorySearchResults(null);
                    setMemorySearchQuery("");
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Clear Results
                </button>
              )}
            </form>

            {/* Semantic Search Results Display */}
            {memorySearchResults && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Matched {memorySearchResults.length} Memory Records:</span>
                  <span className="text-indigo-600 font-mono text-[10px]">Ranked by Similarity Score</span>
                </div>
                {memorySearchResults.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No memories exceeded similarity threshold for this query.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {memorySearchResults.map((r, i) => (
                      <div
                        key={i}
                        className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              {r.memory_type}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                              {r.category}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Match Score: <strong className="text-indigo-700">{r.score}</strong>
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium leading-relaxed">
                            {r.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add New FinOps Rule Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Teach Agent New FinOps Rule / Exemption
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                You can also teach the agent directly in chat: <em>&ldquo;Remember that vol-0a88 is DR standby&rdquo;</em>
              </span>
            </div>

            <form onSubmit={handleAddMemory} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Policy / Exemption Statement
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g. Volume vol-0a882a6f is a MongoDB DR standby in us-east-1; do not remediate or flag as waste."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Memory Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-sans"
                  >
                    <option value="RESOURCE_EXEMPTION">RESOURCE_EXEMPTION (Exempt an AWS asset)</option>
                    <option value="FINOPS_RULE">FINOPS_RULE (Budget or Governance Policy)</option>
                    <option value="USER_PREFERENCE">USER_PREFERENCE (Formatting or Recommendation Bias)</option>
                    <option value="ANOMALY_NOTE">ANOMALY_NOTE (Known historical spike context)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    AWS Service Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-sans"
                  >
                    <option value="GENERAL">GENERAL (All Services)</option>
                    <option value="IDLE_WASTE">IDLE_WASTE (EBS, NAT, Elastic IP)</option>
                    <option value="BUDGET">BUDGET (Thresholds & Forecasts)</option>
                    <option value="EC2">EC2 (Compute & Savings Plans)</option>
                    <option value="S3">S3 (Storage & Lifecycles)</option>
                    <option value="RDS">RDS (Databases)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addingMemory || !newContent.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {addingMemory ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Commit to Agent Memory</span>
                </button>
              </div>
            </form>
          </div>

          {/* Stored Memories List */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Memories for {tenantId} ({memories.length})
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                {/* Category Filter Pills */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold text-slate-600">
                  {["ALL", "IDLE_WASTE", "BUDGET", "EC2", "S3"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMemoryCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        memoryCategoryFilter === cat
                          ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                          : "hover:text-slate-900"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {memories.length > 0 && (
                  <button
                    onClick={handleClearMemories}
                    className="px-2.5 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-[10px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {memoryLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading memories...
              </div>
            ) : memories.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500 space-y-2">
                <Brain className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">No active memories stored for this category.</p>
                <p className="text-[11px] text-slate-500">
                  Add a rule above or instruct the agent in the chat console to remember team preferences.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            m.memory_type === "RESOURCE_EXEMPTION"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : m.memory_type === "FINOPS_RULE"
                              ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }`}
                        >
                          {m.memory_type}
                        </span>

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                          {m.category}
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                          <Database className="w-3 h-3 text-slate-400" />
                          <span>vector: {m.embedding_provider || "hybrid-cpu-dense"}</span>
                        </span>

                        {m.created_at && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(m.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-800 leading-relaxed">
                        {m.content}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete this memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
