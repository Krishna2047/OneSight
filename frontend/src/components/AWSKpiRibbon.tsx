"use client";

import React from "react";
import { AWSKpiSummary } from "@/types";
import {
  TrendingUp,
  Calendar,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  AlertTriangle,
  HardDrive,
  Sparkles,
} from "lucide-react";

interface AWSKpiRibbonProps {
  kpi: AWSKpiSummary | null;
  idleMonthlyWaste: number;
  anomalyCount: number;
  onNavigateToAnomalies: () => void;
  onNavigateToIdle: () => void;
}

export function AWSKpiRibbon({
  kpi,
  idleMonthlyWaste,
  anomalyCount,
  onNavigateToAnomalies,
  onNavigateToIdle,
}: AWSKpiRibbonProps) {
  if (!kpi) return null;

  const isVariancePositive = kpi.variance_amount > 0;

  return (
    <div className="space-y-4">
      {/* Active AWS Cost Anomaly Warning Banner */}
      {anomalyCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-white to-rose-50/50 border border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-rose-900">
                  {anomalyCount} AWS Cost Anomalies Flagged Across Linked Accounts
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-800">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-rose-700/90 mt-0.5">
                Automated Root Cause Analysis identified unexpected spikes in Bedrock GenAI tokens and NAT Gateway cross-AZ egress.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToAnomalies}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Inspect AI RCA</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* MTD Spend */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month-to-Date (MTD)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ${kpi.mtd_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Accrued spend</span>
            <span className="font-semibold text-slate-700">AWS Org</span>
          </div>
        </div>

        {/* Forecast Month-End */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Forecasted Month-End</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600 tracking-tight">
            ${kpi.forecast_month_end.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Projected bill</span>
            <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">On Track</span>
          </div>
        </div>

        {/* Prior Month Variance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vs Prior Month</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isVariancePositive ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {isVariancePositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              isVariancePositive ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {isVariancePositive ? "+" : "-"}${Math.abs(kpi.variance_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Cycle variance</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                isVariancePositive ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {kpi.variance_percent > 0 ? `+${kpi.variance_percent}%` : `${kpi.variance_percent}%`}
            </span>
          </div>
        </div>

        {/* Daily Burn Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Burn Rate</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ${kpi.daily_burn_rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-400">/day</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>7-day moving avg</span>
            <span className="font-semibold text-slate-700">Steady</span>
          </div>
        </div>

        {/* Idle Waste Identified */}
        <div
          onClick={onNavigateToIdle}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-indigo-300 hover:shadow cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Idle Waste Identified</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight">
            ${idleMonthlyWaste.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-400">/mo</span>
          </div>
          <div className="flex items-center justify-between text-xs text-indigo-600 font-medium mt-2 pt-2 border-t border-slate-100 group-hover:underline">
            <span>Remediate EBS & NAT</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
