"use client";

import React, { useState } from "react";
import {
  Home,
  Sparkles,
  Layers,
  Database,
  ShieldAlert,
  Sliders,
  DollarSign,
  PieChart,
  HardDrive,
  Bell,
  Bot,
  Settings,
  ChevronDown,
  ChevronRight,
  Cloud,
  FileText,
  Server,
  Zap,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  anomalyCount: number;
}

export function Sidebar({ activeTab, setActiveTab, anomalyCount }: SidebarProps) {
  const [finopsOpen, setFinopsOpen] = useState(true);
  const [policiesOpen, setPoliciesOpen] = useState(true);
  const [savingsOpen, setSavingsOpen] = useState(true);
  const [systemOpen, setSystemOpen] = useState(true);

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 min-h-screen text-slate-700 select-none">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#3B49DF] flex items-center justify-center text-white shadow-xs">
            <Cloud className="w-4 h-4 fill-white text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold text-slate-900 tracking-tight font-sans">Costimizer</span>
            <span className="text-[10px] text-indigo-600 font-semibold block leading-none">OneSight FinOps</span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 text-xs">
        {/* Main Section */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab("home")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === "home"
                ? "bg-indigo-50 text-indigo-600 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab("pools")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === "pools"
                ? "bg-indigo-50 text-indigo-600 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Pools & Accounts</span>
          </button>
        </div>

        {/* FINOPS Section */}
        <div className="space-y-1">
          <div
            onClick={() => setFinopsOpen(!finopsOpen)}
            className="flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600"
          >
            <span>FinOps</span>
            {finopsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
          {finopsOpen && (
            <div className="space-y-0.5 pt-1">
              <button
                onClick={() => setActiveTab("cost-explorer")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === "cost-explorer"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Cost Explorer</span>
              </button>

              <button
                onClick={() => setActiveTab("cost-map")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === "cost-map"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <PieChart className="w-4 h-4 text-slate-400" />
                <span>Cost Map</span>
              </button>
            </div>
          )}
        </div>

        {/* POLICIES Section */}
        <div className="space-y-1">
          <div
            onClick={() => setPoliciesOpen(!policiesOpen)}
            className="flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600"
          >
            <span>Policies</span>
            {policiesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
          {policiesOpen && (
            <div className="space-y-0.5 pt-1">
              <button
                onClick={() => setActiveTab("anomalies")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === "anomalies"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span>Anomaly Detection</span>
                </div>
                {anomalyCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("policies")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === "policies"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Sliders className="w-4 h-4 text-slate-400" />
                <span>Quotas & Budgets</span>
              </button>
            </div>
          )}
        </div>

        {/* SAVINGS Section */}
        <div className="space-y-1">
          <div
            onClick={() => setSavingsOpen(!savingsOpen)}
            className="flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600"
          >
            <span>Savings</span>
            {savingsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
          {savingsOpen && (
            <div className="space-y-0.5 pt-1">
              <button
                onClick={() => setActiveTab("idle")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === "idle"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span>Idle Waste Auditor</span>
              </button>
            </div>
          )}
        </div>

        {/* SYSTEM Section */}
        <div className="space-y-1">
          <div
            onClick={() => setSystemOpen(!systemOpen)}
            className="flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600"
          >
            <span>System</span>
            {systemOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
          {systemOpen && (
            <div className="space-y-0.5 pt-1">
              <button
                onClick={() => setActiveTab("alerts")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === "alerts"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Bell className="w-4 h-4 text-slate-400" />
                <span>Alerts & Channels</span>
              </button>

              <button
                onClick={() => setActiveTab("agent")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === "agent"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Bot className="w-4 h-4 text-amber-500" />
                <span>AI Copilot</span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === "settings"
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-slate-400 text-[11px] flex items-center justify-between">
        <span>OneSight v2.2</span>
        <span className="text-emerald-600 font-semibold flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active</span>
        </span>
      </div>
    </aside>
  );
}
