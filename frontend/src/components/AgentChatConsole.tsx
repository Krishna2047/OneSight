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
        text: `⚠️ **Agent Error:** ${err.message || "Could not reach FinOps Agent runtime."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleThought = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-[700px] rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur overflow-hidden">
      {/* Console Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>FinOps AI Agentic Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-400">
              Autonomous reasoning over AWS, GCP, Azure metrics & optimization tools
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            Engine: ReAct + FinOps Reasoning
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((m) => {
          const isAgent = m.sender === "agent";
          const isThoughtExpanded = expandedThoughts[m.id];

          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${isAgent ? "" : "flex-row-reverse space-x-reverse"}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isAgent
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className={`space-y-2 max-w-2xl ${isAgent ? "" : "items-end"}`}>
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isAgent
                      ? "bg-slate-800/80 border border-slate-700/80 text-slate-200 shadow-sm"
                      : "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  }`}
                >
                  {m.text}
                </div>

                {/* Agent Tool & Thought Traces */}
                {isAgent && (m.tools || m.thoughts) && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 space-y-1.5 text-[11px]">
                    {m.tools && m.tools.length > 0 && (
                      <div className="flex items-center space-x-1.5 text-slate-400 font-mono">
                        <Wrench className="w-3 h-3 text-indigo-400" />
                        <span>Tools Executed:</span>
                        {m.tools.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {m.thoughts && (
                      <div>
                        <button
                          onClick={() => toggleThought(m.id)}
                          className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Cpu className="w-3 h-3 text-amber-400" />
                          <span>Agent Chain-of-Thought</span>
                          {isThoughtExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        {isThoughtExpanded && (
                          <pre className="mt-1.5 p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400 whitespace-pre-wrap">
                            {m.thoughts}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <span className="text-[10px] text-slate-500 block px-1">{m.timestamp}</span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-3 text-xs text-indigo-400">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <span className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              FinOps Agent is reasoning over cloud billing telemetry...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-semibold text-slate-400 shrink-0 flex items-center space-x-1">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>Try:</span>
        </span>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
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
            placeholder="Ask FinOps AI (e.g. 'Why did S3 spend surge?' or 'Find unused EBS disks')..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
