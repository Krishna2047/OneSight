"use client";

import React, { useState, useRef, useEffect } from "react";
import { AgentChatMessage, AgentActionProposal } from "@/types";
import { api } from "@/lib/api";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Wrench,
  ChevronDown,
  ChevronUp,
  Cpu,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Settings,
  ChevronDown as ChevronDownIcon,
  Brain,
  Shield,
  ShieldAlert,
  Loader2,
  FileText
} from "lucide-react";

interface AgentChatConsoleProps {
  tenantId?: string;
  onOpenSettings?: () => void;
}

export function AgentChatConsole({ tenantId = "tenant-acme", onOpenSettings }: AgentChatConsoleProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: "initial",
      sender: "agent",
      text: "👋 Welcome to your **OneSight FinOps AI Copilot**!\n\nI am connected to your live AWS account (`476383094285`). Ask me to run live read-only AWS CLI commands (e.g. `aws s3api list-buckets`, `aws ec2 describe-instances`), audit idle resource waste, analyze spend spikes, or review Compute Savings Plans.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadAIConfig = async () => {
    try {
      const res = await api.getAIConfig(tenantId);
      setAiConfig(res);
    } catch (e) {
      console.warn("Could not load AI provider config", e);
    }
  };

  useEffect(() => {
    loadAIConfig();
  }, [tenantId]);

  const switchProvider = async (newProvider: string) => {
    try {
      await api.updateAIConfig({ active_provider: newProvider }, tenantId);
      await loadAIConfig();
      setIsProviderMenuOpen(false);
      const note: AgentChatMessage = {
        id: Date.now().toString(),
        sender: "agent",
        text: `⚡ **AI Provider Switched**: Now reasoning live via **${newProvider.toUpperCase()}** (${newProvider === 'ollama' ? 'Local Llama 3.1' : 'Groq Cloud'}).`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, note]);
    } catch (e: any) {
      alert("Error switching provider: " + e.message);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard", err);
    }
  };

  const quickPrompts = [
    "What idle resources are wasting money?",
    "aws s3api list-buckets",
    "What are our top spending AWS services?",
    "aws ec2 describe-instances",
    "Give me an AWS spend summary and forecast"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: AgentChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.chatWithAgent(tenantId, query);
      const agentMsg: AgentChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tools: res.tools,
        thoughts: res.thoughts,
        proposal: res.proposal,
        executed_commands: res.executed_commands,
        recalled_knowledge: (res as any).recalled_knowledge,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: AgentChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        text: `⚠️ Error executing agent pipeline: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProposal = async (msgId: string, proposal: AgentActionProposal, action: "APPROVE" | "EXEMPT" | "REJECT") => {
    const actionKey = proposal.proposal_id || msgId;
    setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
    try {
      const res = await api.approveProposal(tenantId, {
        proposal_id: proposal.proposal_id || msgId,
        action,
        resource_id: proposal.resource_id,
        resource_name: proposal.resource_name,
        monthly_savings: proposal.monthly_savings
      });

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.proposal) {
            return {
              ...m,
              proposal: {
                ...m.proposal,
                status: res.status,
                exempted: res.status === "EXEMPTED",
                exemption_reason: res.status === "EXEMPTED" ? "Committed to Mem0 by human operator" : m.proposal.exemption_reason
              }
            };
          }
          return m;
        })
      );

      const confirmMsg: AgentChatMessage = {
        id: Date.now().toString(),
        sender: "agent",
        text: action === "APPROVE"
          ? `✅ **Action Approved & Executed**: Automated snapshot created and volume release executed for \`${proposal.resource_id}\` (${proposal.resource_name || 'Asset'}). Recaptured **$${(proposal.monthly_savings || 0).toFixed(2)}/mo**.`
          : action === "EXEMPT"
          ? `🛡️ **Mem0 Exemption Saved**: Permanent exemption rule committed for \`${proposal.resource_id}\`. The FinOps AI agent will ignore this asset in all future idle audits.`
          : `Action proposal for \`${proposal.resource_id}\` was dismissed.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tools: [action === "APPROVE" ? "aws_ec2_create_snapshot" : "mem0_save_rule"]
      };
      setMessages((prev) => [...prev, confirmMsg]);
    } catch (err: any) {
      alert("Failed to process proposal: " + err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const toggleThoughts = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl flex flex-col h-[800px] min-h-[650px] overflow-hidden">
      {/* Console Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">FinOps AI Agentic Copilot</h3>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>LangGraph & Mem0 Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Autonomous reasoning over AWS CUR, anomaly telemetry & real-time read-only inspection tools
            </p>
          </div>
        </div>

        {/* Interactive AI Provider Selector Pill inside the AI itself */}
        <div className="relative">
          <button
            onClick={() => setIsProviderMenuOpen(!isProviderMenuOpen)}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 transition-colors cursor-pointer"
            title="Click to switch AI Engine"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-500 hidden sm:inline">AI Engine:</span>
            <span className="font-bold text-slate-900 flex items-center space-x-1">
              <span>
                {aiConfig?.active_provider === "ollama"
                  ? "🦙 Ollama (Local)"
                  : aiConfig?.active_provider === "groq"
                  ? "⚡ Groq (Cloud)"
                  : "LangGraph (ReAct)"}
              </span>
            </span>
            <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProviderMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 text-xs space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Active AI Provider
              </div>

              <button
                onClick={() => switchProvider("ollama")}
                className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  aiConfig?.active_provider === "ollama"
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">🦙</span>
                  <div>
                    <div className="font-semibold">Ollama (Local)</div>
                    <div className="text-[10px] text-slate-400">100% Private Llama 3.1</div>
                  </div>
                </div>
                {aiConfig?.active_provider === "ollama" && (
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                )}
              </button>

              <button
                onClick={() => switchProvider("groq")}
                className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  aiConfig?.active_provider === "groq"
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">⚡</span>
                  <div>
                    <div className="font-semibold">Groq Cloud</div>
                    <div className="text-[10px] text-slate-400">Ultra-Fast 120B Inference</div>
                  </div>
                </div>
                {aiConfig?.active_provider === "groq" && (
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                )}
              </button>

              {onOpenSettings && (
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsProviderMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-medium flex items-center space-x-2 cursor-pointer text-[11px]"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Configure Models & Keys in Settings...</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
        {messages.map((m) => {
          const isAgent = m.sender === "agent";

          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${isAgent ? "justify-start" : "justify-end flex-row-reverse space-x-reverse"}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  isAgent
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-white font-bold text-xs"
                }`}
              >
                {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className={`space-y-2 w-full ${isAgent ? "max-w-2xl lg:max-w-3xl text-left" : "max-w-lg text-right flex flex-col items-end"}`}>
                {/* Agent Thought / Tool Execution Accordion */}
                {isAgent && (m.tools?.length || m.thoughts?.length || m.executed_commands?.length) && (
                  <div className="bg-white border border-slate-200/90 rounded-xl p-3 text-xs shadow-2xs space-y-2 text-left w-full">
                    <button
                      onClick={() => toggleThoughts(m.id)}
                      className="flex items-center justify-between w-full text-indigo-600 hover:text-indigo-700 font-semibold text-[11px] cursor-pointer"
                    >
                      <span className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <span className="flex items-center space-x-1">
                          <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            Executed {m.tools?.length || 0} Autonomous Tool{m.tools?.length === 1 ? "" : "s"}
                          </span>
                        </span>
                        {m.tools?.includes("mem0_hybrid_recall") && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1">
                            <Brain className="w-2.5 h-2.5 text-indigo-600" />
                            <span>Mem0 Recalled</span>
                          </span>
                        )}
                        {m.tools?.includes("mem0_save_rule") && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                            <Brain className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Mem0 Learned</span>
                          </span>
                        )}
                        {m.executed_commands && m.executed_commands.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center space-x-1">
                            <Terminal className="w-2.5 h-2.5 text-slate-700" />
                            <span>{m.executed_commands.length} AWS Command{m.executed_commands.length === 1 ? "" : "s"}</span>
                          </span>
                        )}
                        {m.recalled_knowledge && m.recalled_knowledge.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center space-x-1">
                            <FileText className="w-2.5 h-2.5 text-purple-600" />
                            <span>RAG Grounded ({m.recalled_knowledge.length} Doc{m.recalled_knowledge.length === 1 ? "" : "s"})</span>
                          </span>
                        )}
                      </span>
                      {expandedThoughts[m.id] ? (
                        <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>

                    {expandedThoughts[m.id] && (
                      <div className="pt-2 border-t border-slate-100 space-y-2.5 text-[11px]">
                        {m.thoughts && (
                          <div className="text-slate-600 bg-slate-50 p-2.5 rounded-lg font-mono text-[11px] border border-slate-200/60 leading-relaxed">
                            💭 {m.thoughts}
                          </div>
                        )}

                        {/* Executed Tools List */}
                        {m.tools?.map((t: any, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 p-2 rounded-lg border border-slate-200/80 space-y-1 font-mono text-[10px]"
                          >
                            <div className="text-indigo-600 font-bold flex items-center space-x-1">
                              <Terminal className="w-3 h-3" />
                              <span>tool: {typeof t === "string" ? t : t.tool || "unknown"}</span>
                            </div>
                            {typeof t !== "string" && t.inputs && (
                              <div className="text-slate-500 truncate">
                                inputs: {JSON.stringify(t.inputs)}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Live Executed AWS CLI Commands Accordion */}
                        {m.executed_commands && m.executed_commands.length > 0 && (
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                              <Terminal className="w-3 h-3 text-indigo-500" />
                              <span>Live AWS Read-Only Executions ({m.executed_commands.length})</span>
                            </div>
                            {m.executed_commands.map((cmd, cIdx) => (
                              <div key={cIdx} className="bg-slate-900 text-slate-200 p-2.5 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                                    <span>🔧 Executed:</span>
                                    <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{cmd.command}</span>
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      cmd.status === "SUCCESS"
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : cmd.status === "BLOCKED"
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    }`}>
                                      {cmd.status}
                                    </span>
                                    <span className="text-slate-400 text-[10px]">{cmd.latency_ms || 0}ms</span>
                                  </div>
                                </div>
                                {cmd.output && (
                                  <div className="bg-black/60 p-2 rounded text-[10px] text-slate-300 overflow-x-auto max-h-36 whitespace-pre font-mono border border-slate-800/80">
                                    {cmd.output}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                {isAgent ? (
                  <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-5 shadow-xs text-xs text-slate-800 text-left w-full space-y-3">
                    <MarkdownRenderer content={m.text} />

                    {/* Human-in-the-Loop Action Proposal Card */}
                    {m.proposal && (
                      <div className="mt-3.5 border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/60 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">⚡ Action Proposal (Human Approval Gate)</h4>
                              <p className="text-[10px] text-slate-500">Autonomous FinOps Agent recommendation ready for verification</p>
                            </div>
                          </div>
                          {m.proposal.exempted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center space-x-1">
                              <Brain className="w-3 h-3 text-purple-600" />
                              <span>Exempted in Mem0</span>
                            </span>
                          ) : m.proposal.status === "REMEDIATED" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Remediated</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Approval
                            </span>
                          )}
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/70 text-[11px]">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Target Asset</span>
                            <span className="font-mono text-slate-800 text-[10px] font-bold truncate block" title={m.proposal.resource_id}>
                              {m.proposal.resource_id}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Asset Name</span>
                            <span className="text-slate-700 font-medium truncate block">
                              {m.proposal.resource_name || "EBS Volume"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Recommended Action</span>
                            <span className="text-indigo-600 font-semibold">{m.proposal.action}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Monthly Recapture</span>
                            <span className="text-emerald-600 font-bold">
                              +${(m.proposal.monthly_savings || 0).toFixed(2)}/mo
                            </span>
                          </div>
                        </div>

                        {/* Safety Note */}
                        {m.proposal.safety_notes && (
                          <div className="text-[10px] text-slate-600 bg-amber-50/60 border border-amber-200/60 p-2 rounded-lg flex items-start space-x-1.5">
                            <span className="text-amber-600 font-bold shrink-0">🛡️ Safety Guardrail:</span>
                            <span>{m.proposal.safety_notes}</span>
                          </div>
                        )}

                        {/* Exemption notice */}
                        {m.proposal.exempted && m.proposal.exemption_reason && (
                          <div className="text-[10px] text-purple-700 bg-purple-50/80 border border-purple-200 p-2 rounded-lg flex items-start space-x-1.5">
                            <Brain className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <span><strong>Mem0 Policy Match:</strong> {m.proposal.exemption_reason}</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {(!m.proposal.status || m.proposal.status === "PENDING") && !m.proposal.exempted && (
                          <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-2">
                            <button
                              onClick={() => handleApproveProposal(m.id, m.proposal!, "APPROVE")}
                              disabled={actionLoading[m.proposal.proposal_id || m.id]}
                              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {actionLoading[m.proposal.proposal_id || m.id] ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Approve & Execute via AWS</span>
                            </button>

                            <button
                              onClick={() => handleApproveProposal(m.id, m.proposal!, "EXEMPT")}
                              disabled={actionLoading[m.proposal.proposal_id || m.id]}
                              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Brain className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Exempt & Add to Mem0</span>
                            </button>

                            <button
                              onClick={() => handleApproveProposal(m.id, m.proposal!, "REJECT")}
                              disabled={actionLoading[m.proposal.proposal_id || m.id]}
                              className="text-slate-400 hover:text-slate-600 px-2 py-1 text-xs cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        {m.proposal.status === "REMEDIATED" && (
                          <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Remediation completed successfully. Recaptured ${(m.proposal.monthly_savings || 0).toFixed(2)}/mo.</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono text-[10px]">{m.timestamp}</span>
                      <button
                        onClick={() => copyToClipboard(m.text, m.id)}
                        className="flex items-center space-x-1 hover:text-indigo-600 text-slate-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-50 cursor-pointer text-[10px]"
                        title="Copy formatted answer"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end space-y-1">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs text-xs font-medium text-left leading-relaxed max-w-lg">
                      {m.text}
                    </div>
                    <div className="text-[10px] text-slate-400 px-1 font-mono">
                      {m.timestamp}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm text-xs text-slate-500 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <span>FinOps AI is reasoning through LangGraph & executing read-only AWS tools...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto text-xs">
        <span className="text-slate-400 flex items-center space-x-1 shrink-0 text-[11px] font-semibold">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Try:</span>
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp)}
            className="px-3 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs border border-slate-200/80 shadow-xs whitespace-nowrap transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Prompt Box */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask FinOps AI (e.g. 'aws s3api list-buckets' or 'Find unused EBS volumes')..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
