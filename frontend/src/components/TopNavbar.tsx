"use client";

import React, { useState } from "react";
import { TenantItem, AWSAccountItem } from "@/types";
import {
  ChevronDown,
  Search,
  Plus,
  HelpCircle,
  Bell,
  Check,
  Building2,
  Calendar,
  Cloud,
  Settings,
  Globe,
  Users,
  LogOut,
  Zap,
  Shield,
  RefreshCw,
} from "lucide-react";

interface TopNavbarProps {
  tenants: TenantItem[];
  currentTenantId: string;
  onTenantChange: (tenantId: string) => void;
  accounts: AWSAccountItem[];
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
  onSimulateSpike: () => void;
  onOpenConnectAWS?: () => void;
  onSyncBill?: () => void;
  isSyncing?: boolean;
}

export function TopNavbar({
  tenants,
  currentTenantId,
  onTenantChange,
  accounts,
  selectedAccountId,
  onAccountChange,
  onSimulateSpike,
  onOpenConnectAWS,
  onSyncBill,
  isSyncing = false,
}: TopNavbarProps) {
  const [orgOpen, setOrgOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [isDemoAccount, setIsDemoAccount] = useState(false);

  const currentTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0];

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const currentAccount = accounts.find((a) => a.account_id === selectedAccountId) || accounts[0];
  const displayAccountId = currentAccount?.account_id || "Connected";
  const displayAccountName = currentAccount?.account_name || "Cloud Admin";

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Organization Switcher */}
      <div className="flex items-center space-x-4">
        {/* Organization Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setOrgOpen(!orgOpen);
              setProfileOpen(false);
            }}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-sm transition-all"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
              {currentTenant?.name[0] || "O"}
            </div>
            <span className="truncate max-w-[150px]">{currentTenant?.name || "Our Organization"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Org Dropdown Menu (Matching Image 5) */}
          {orgOpen && (
            <div className="absolute top-11 left-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in duration-150">
              {/* Search Bar */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                Organizations
              </span>

              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {filteredTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onTenantChange(t.id);
                      setOrgOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                      currentTenantId === t.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {t.name[0]}
                      </div>
                      <span className="truncate max-w-[150px]">{t.name}</span>
                    </div>
                    {currentTenantId === t.id && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => alert("Multi-tenant organization creation enabled.")}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Account filter, Date Picker, Help, Bell, User Profile */}
      <div className="flex items-center space-x-3">
        {/* 1-Click AWS STS Account Onboarding Button */}
        {onOpenConnectAWS && (
          <button
            onClick={onOpenConnectAWS}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-xs"
            title="1-Click AWS STS Cross-Account Onboarding"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>1-Click AWS Onboarding</span>
          </button>
        )}

        {/* Sync Latest Bill Button */}
        {onSyncBill && (
          <button
            onClick={onSyncBill}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
            title="Sync latest daily bill from AWS Cost Explorer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync AWS Bill"}</span>
          </button>
        )}

        {/* Simulate Spike Button */}
        <button
          onClick={onSimulateSpike}
          className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold transition-colors"
          title="Inject realistic spike"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Simulate Spike</span>
        </button>

        {/* All Accounts Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedAccountId}
            onChange={(e) => onAccountChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 font-medium outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="ALL">All Accounts ({accounts.length})</option>
            {accounts.map((acc) => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_name} ({acc.account_id.slice(-4)})
              </option>
            ))}
          </select>
        </div>

        {/* Date Selector */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>This Month</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>

        {/* Help & Notification Icons */}
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>

        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 relative transition-colors">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5" />
        </button>

        {/* User Profile Dropdown (Matching Image 4) */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setOrgOpen(false);
            }}
            className="flex items-center space-x-2 pl-2 cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              AWS
            </div>
            <div className="text-left hidden xl:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight">{displayAccountName}</span>
              <span className="text-[10px] text-slate-400 block leading-tight font-mono">{displayAccountId}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute top-11 right-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in duration-150 text-xs">
              {/* Profile Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    AWS
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">{displayAccountName}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">Account: {displayAccountId}</p>
                  </div>
                </div>
                <button className="px-2.5 py-1 text-[11px] font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  Edit
                </button>
              </div>

              {/* Demo Switcher Toggle */}
              <div className="py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Switch to Demo account</span>
                <button
                  onClick={() => setIsDemoAccount(!isDemoAccount)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    isDemoAccount ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isDemoAccount ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Menu Links */}
              <div className="py-2 space-y-1">
                <button className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-indigo-700 bg-indigo-50 font-semibold rounded-xl">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  <span>Settings</span>
                </button>

                <button className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 rounded-xl">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>Language</span>
                </button>

                <button className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 rounded-xl">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Invite Friends</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 text-red-600 hover:bg-red-50 font-medium rounded-xl">
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
