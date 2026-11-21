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
  ChevronRight,
  Zap,
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
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MEDIUM":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DETECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "INVESTIGATING":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">AWS Cost Anomaly Detection Feed</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Statistical deviation alerts powered by rolling Z-score & FinOps Autonomous Root Cause Analysis
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onSimulateSpike}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Spike</span>
            </button>
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200"
              title="Refresh Anomalies"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Severity Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by AWS service or member account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Anomaly Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200/90 rounded-2xl shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-900">No Cost Anomalies Detected</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              All linked AWS member accounts and cloud services are currently operating within normal baseline spend boundaries.
            </p>
          </div>
        ) : (
          filtered.map((anomaly) => (
            <div
              key={anomaly.id}
              onClick={() => onSelectAnomaly(anomaly)}
              className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all cursor-pointer group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Metadata & Culprit Service */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getSeverityBadge(
                        anomaly.severity
                      )}`}
                    >
                      {anomaly.severity}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                        anomaly.status
                      )}`}
                    >
                      {anomaly.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {anomaly.account_name} ({anomaly.account_id})
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {anomaly.region}
                    </span>
                  </div>

                  {/* Service Title */}
                  <div className="flex items-center space-x-2">
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {anomaly.service_name}
                    </h4>
                    {anomaly.usage_type && (
                      <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {anomaly.usage_type}
                      </span>
                    )}
                  </div>

                  {/* AI RCA Summary Preview */}
                  {anomaly.root_cause_summary && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 flex items-start space-x-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">RCA Diagnostic: </span>
                        <span>{anomaly.root_cause_summary}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Cost Delta, Surge % & Action Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xl font-bold text-rose-600 tracking-tight font-mono">
                      +${anomaly.cost_delta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-1 justify-end mt-0.5">
                      <span>Baseline: ${anomaly.baseline_cost.toFixed(2)}</span>
                      <span className="font-bold text-rose-600">
                        (+{anomaly.deviation_percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <button className="px-3.5 py-1.5 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1 transition-all shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View AI RCA</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
