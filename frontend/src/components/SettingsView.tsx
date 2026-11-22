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
  Play
} from "lucide-react";

interface SettingsViewProps {
  tenantId?: string;
  onNavigateToCopilot?: () => void;
}

export function SettingsView({ tenantId = "tenant-acme", onNavigateToCopilot }: SettingsViewProps) {
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

  useEffect(() => {
    loadConfig();
  }, [tenantId]);

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
                  AI Engine & Cloud Settings
                </h2>
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Cpu className="w-3 h-3 text-indigo-600" />
                  <span>Agentic AI Settings</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch and configure your active FinOps AI inference provider (Local Ollama, Groq, OpenAI, Gemini)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadConfig}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
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
            <span>Save & Apply Settings</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveSuccess}</span>
        </div>
      )}

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
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                ollama?.available
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  ollama?.available ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span>{ollama?.available ? "Server Online" : "Server Offline"}</span>
            </span>
          </div>

          <div className="mt-5 space-y-3.5 text-xs pt-4 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Active Local Model:
              </label>
              <select
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {(ollama?.installed_models || ["llama3.1", "llama3.1:latest"]).map((m: string) => (
                  <option key={m} value={m}>
                    {m} {m.includes("llama3.1") ? "(Recommended)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Auto-detected models installed in your local Ollama runtime.
              </p>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Ollama Endpoint URL:
              </label>
              <input
                type="text"
                value={ollamaBaseUrl}
                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="http://localhost:11434"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleTestConnection("ollama", ollamaModel)}
                disabled={testing || !ollama?.available}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Play className="w-3 h-3 text-indigo-600" />
                <span>Test Connection</span>
              </button>

              <span className="text-[11px] text-slate-400 font-mono">
                Port: 11434
              </span>
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
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">Groq Cloud (Ultra-Fast)</h3>
                  {activeProvider === "groq" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Free cloud inference with Meta Llama 3.3 & GPT-OSS 120B
                </p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                groq?.available
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  groq?.available ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>{groq?.available ? "Configured" : "No Key Set"}</span>
            </span>
          </div>

          <div className="mt-5 space-y-3.5 text-xs pt-4 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Cloud Model:
              </label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {(groq?.available_models || ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile"]).map((m: string) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Groq API Key:
              </label>
              <input
                type="password"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder={groq?.api_key_masked ? `Current: ${groq.api_key_masked}` : "gsk_..."}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Stored in `.env` and encrypted in memory.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleTestConnection("groq", groqModel)}
                disabled={testing || !groq?.available}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Play className="w-3 h-3 text-indigo-600" />
                <span>Test Connection</span>
              </button>

              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 hover:underline flex items-center space-x-1"
              >
                <span>Get Free Groq Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
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
  );
}
