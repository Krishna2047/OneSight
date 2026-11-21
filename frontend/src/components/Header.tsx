"use client";

import React from "react";
import { TenantItem, AWSAccountItem } from "@/types";
import {
  Eye,
  Building2,
  ChevronDown,
  RefreshCw,
  Zap,
  Sparkles,
  ShieldAlert,
  Layers,
  Trash2,
  Bell,
  Cloud,
} from "lucide-react";

interface HeaderProps {
  tenants: TenantItem[];
  currentTenantId: string;
  onTenantChange: (tenantId: string) => void;
  accounts: AWSAccountItem[];
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
  onRefresh: () => void;
  onOpenSimulateSpike: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  anomalyCount: number;
}

export function Header({
  tenants,
  currentTenantId,
  onTenantChange,
  accounts,
  selectedAccountId,
  onAccountChange,
  onRefresh,
  onOpenSimulateSpike,
  activeTab,
  setActiveTab,
  anomalyCount,
}: HeaderProps) {
  const currentTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0];

  const tabs = [
    { id: "cost-explorer", label: "AWS Cost Explorer", icon: Layers },
    { id: "anomalies", label: `Cost Anomaly Detection (${anomalyCount})`, badge: anomalyCount > 0, icon: ShieldAlert },
    { id: "alerts", label: "Alert Rules & Dispatcher", icon: Bell },
    { id: "agent", label: "AWS FinOps Copilot", icon: Sparkles },
    { id: "idle", label: "Idle Waste Auditor", icon: Trash2 },
  ];

  return (
    <header className="border-b border-slate-800 bg-[#070b13]/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Multi-Tenant Organization Switcher */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-sm">
                AWS
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold tracking-tight text-white">OneSight</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
                    AWS Cost Explorer
                  </span>
                </div>
              </div>
            </div>

            {/* Tenant / Organization Switcher Dropdown */}
            <div className="hidden md:flex items-center pl-3 border-l border-slate-800">
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] text-slate-400 font-medium">Tenant:</span>
                <select
                  value={currentTenantId}
                  onChange={(e) => onTenantChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                      {t.name} ({t.plan})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linked AWS Account Selector */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5">
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-slate-400 font-medium">Account:</span>
                <select
                  value={selectedAccountId}
                  onChange={(e) => onAccountChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="ALL" className="bg-slate-900 text-white">
                    All Linked Accounts ({accounts.length})
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id} className="bg-slate-900 text-white">
                      {acc.account_name} ({acc.account_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onOpenSimulateSpike}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors shadow-sm"
              title="Inject realistic AWS cost spike to test detection & alerting"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Spike</span>
            </button>

            <button
              onClick={onRefresh}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-900">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : "text-amber-400"}`} />}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
