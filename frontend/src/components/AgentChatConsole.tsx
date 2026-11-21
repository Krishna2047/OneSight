"use client";

import React, { useState, useRef, useEffect } from "react";
import { AgentChatMessage } from "@/types";
import { api } from "@/lib/api";
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
} from "lucide-react";

interface AgentChatConsoleProps {
  tenantId?: string;
}

export function AgentChatConsole({ tenantId = "tenant-acme" }: AgentChatConsoleProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: "initial",
      sender: "agent",
      text: "👋 Welcome to the **OneSight FinOps Agentic Platform**!\n\nI monitor and optimize your cloud spend across **AWS, GCP, and Azure**. Ask me anything about cost spikes, idle cloud waste, rightsizing, or budget forecasts.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Why did our cloud bill spike recently?",
    "What idle resources are wasting money?",
    "Give me a multi-cloud spend summary and forecast",
    "How do we reduce AWS Bedrock token costs?",
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

  const toggleThoughts = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl flex flex-col h-[750px] overflow-hidden">
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
                <span>Online</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Autonomous reasoning over AWS CUR, anomaly telemetry & real-time optimization tools
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-semibold">Engine:</span>
          <span>ReAct + FinOps Reasoning</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.map((m) => {
          const isAgent = m.sender === "agent";

          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${isAgent ? "justify-start" : "justify-end flex-row-reverse space-x-reverse"}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isAgent
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-200 text-slate-700 font-bold text-xs"
                }`}
              >
                {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className={`space-y-2 max-w-xl ${isAgent ? "text-left" : "text-right"}`}>
                {/* Agent Thought / Tool Execution Accordion */}
                {isAgent && (m.tools?.length || m.thoughts?.length) && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-sm space-y-2 text-left">
                    <button
                      onClick={() => toggleThoughts(m.id)}
                      className="flex items-center justify-between w-full text-indigo-600 hover:text-indigo-700 font-semibold text-[11px]"
                    >
                      <span className="flex items-center space-x-1.5">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>
                          Executed {m.tools?.length || 0} Autonomous Tools
                        </span>
                      </span>
                      {expandedThoughts[m.id] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedThoughts[m.id] && (
                      <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px]">
                        {m.thoughts && (
                          <div className="text-slate-600 bg-slate-50 p-2 rounded-lg font-mono">
                            💭 {m.thoughts}
                          </div>
                        )}
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
                      </div>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl shadow-sm text-xs leading-relaxed ${
                    isAgent
                      ? "bg-white border border-slate-200/90 text-slate-800 text-left whitespace-pre-wrap"
                      : "bg-indigo-600 text-white text-left font-medium"
                  }`}
                >
                  {m.text}
                </div>

                <div className="text-[10px] text-slate-400 px-1 font-mono">
                  {m.timestamp}
                </div>
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
              <span>FinOps AI is reasoning over CUR telemetry & idle inventory...</span>
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
            placeholder="Ask FinOps AI (e.g. 'Why did S3 spend surge?' or 'Find unused EBS disks')..."
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
