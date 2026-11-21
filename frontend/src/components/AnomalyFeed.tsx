"use client";

import React, { useState } from "react";
import { AnomalyItem } from "@/types";
import {
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Search,
  Cloud,
} from "lucide-react";

interface AnomalyFeedProps {
  anomalies: AnomalyItem[];
  onSelectAnomaly: (anomaly: AnomalyItem) => void;
  onRefresh: () => void;
  onSimulateSpike: () => void;
}

export function AnomalyFeed({
  anomalies,
  onSelectAnomaly,
  onRefresh,
  onSimulateSpike,
}: AnomalyFeedProps) {
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = anomalies.filter((a) => {
    if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;
    if (
      searchQuery &&
      !a.service_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !a.account_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "MEDIUM":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DETECTED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "INVESTIGATING":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "RESOLVED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
        <div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-bold text-white">AWS Cost Anomaly Detection Feed</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical deviation alerts augmented by FinOps Autonomous Root Cause Analysis (RCA)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500 outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Spikes</option>
            <option value="HIGH">High Spikes</option>
            <option value="MEDIUM">Medium Spikes</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter service or account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-slate-500 w-44"
            />
          </div>

          <button
            onClick={onSimulateSpike}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-colors"
          >
            + Test Spike
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
            title="Refresh anomalies"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No AWS cost anomalies currently active for this tenant.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-5 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {item.account_name} ({item.account_id})
                    </span>
                    <span className="text-sm font-semibold text-slate-200">
                      {item.service_name}
                    </span>
                    <span className="text-xs text-slate-500">• {item.region}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  {/* RCA Snippet */}
                  <p className="text-xs text-slate-400 max-w-2xl line-clamp-1">
                    {item.root_cause_summary ? (
                      <span className="text-slate-300">
                        <strong className="text-amber-400">RCA:</strong> {item.root_cause_summary}
                      </span>
                    ) : (
                      "Root Cause Analysis queued for diagnosis..."
                    )}
                  </p>

                  <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-1">
                    <span>Date: <strong className="text-slate-400">{item.anomaly_date}</strong></span>
                    <span>Baseline: <strong className="text-slate-400">${item.baseline_cost.toFixed(2)}</strong></span>
                    <span>Actual Spike: <strong className="text-red-400">${item.current_cost.toFixed(2)}</strong></span>
                    <span>Z-Score: <strong className="text-amber-400">{item.z_score.toFixed(1)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-400 block font-mono">
                      +${item.cost_delta.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-amber-400 font-medium">
                      +{item.deviation_percent.toFixed(1)}% surge
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectAnomaly(item)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>View AI RCA</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
