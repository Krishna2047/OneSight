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
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/60 via-red-900/30 to-slate-900 border border-red-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-200">
                {anomalyCount} AWS Cost Anomalies Flagged Across Linked Accounts
              </h4>
              <p className="text-xs text-red-300/80">
                Automated Root Cause Analysis identified unexpected spikes in Bedrock GenAI & NAT Gateway egress.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToAnomalies}
            className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm shrink-0"
          >
            <span>Inspect AI RCA</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* MTD Spend */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Month-to-Date (MTD)</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white mt-1">
            ${kpi.mtd_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Accrued bill for active cycle</p>
        </div>

        {/* Forecast Month-End */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Forecasted Month-End</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-black text-sky-400 mt-1">
            ${kpi.forecast_month_end.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Projected full-month invoice</p>
        </div>

        {/* Prior Month Variance */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Vs Prior Month</span>
            {isVariancePositive ? (
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div
            className={`text-xl font-black mt-1 ${
              isVariancePositive ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {isVariancePositive ? "+" : ""}
            ${kpi.variance_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isVariancePositive ? "+" : ""}
            {kpi.variance_percent}% vs prior cycle (${kpi.prior_month_spend.toLocaleString()})
          </p>
        </div>

        {/* Daily Burn Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Daily Burn Rate</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl font-black text-amber-400 mt-1">
            ${kpi.daily_burn_rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}/day
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">7-day rolling daily mean</p>
        </div>

        {/* Idle Waste Auditor */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Idle Waste Identified</span>
              <HardDrive className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-400 mt-1">
              ${idleMonthlyWaste.toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
            </div>
          </div>
          <button
            onClick={onNavigateToIdle}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 mt-2"
          >
            <span>Remediate EBS & NAT</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
