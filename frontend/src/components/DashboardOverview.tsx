"use client";

import React, { useState } from "react";
import { DashboardSummaryResponse } from "@/types";
import {
  ExternalLink,
  Info,
  ChevronDown,
  Maximize2,
  DollarSign,
  Shield,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DashboardOverviewProps {
  data: DashboardSummaryResponse | null;
  onNavigateToCostExplorer: () => void;
  onNavigateToIdle: () => void;
  onNavigateToAnomalies: () => void;
}

export function DashboardOverview({
  data,
  onNavigateToCostExplorer,
  onNavigateToIdle,
  onNavigateToAnomalies,
}: DashboardOverviewProps) {
  const [resourceType, setResourceType] = useState("Resources");
  const [page, setPage] = useState(1);

  if (!data) return null;

  const chartData = data.organisation_expenses_chart.months.map((m) => ({
    name: m.month,
    expense: m.amount / 1000, // convert to k
    formatted: m.amount_k,
  }));

  const maxResourceCost = Math.max(...data.top_resource_expenses.map((r) => r.cost), 1);

  return (
    <div className="space-y-6">
      {/* 1. Top Row: 4 Metric Cards (Matching Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Organisational Expenses */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>Organisational Expenses</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {data.kpi.organisational_expenses_k}
            </span>
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span>{data.kpi.change_pct}%</span>
              <TrendingDown className="w-3 h-3" />
            </span>
            <span className="text-xs text-slate-400 font-medium">Last 30 Days</span>
          </div>
        </div>

        {/* Card 2: Forecast Expense */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>Forecast Expense</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {data.kpi.forecast_expense_k}
            </span>
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span>{data.kpi.change_pct}%</span>
              <TrendingDown className="w-3 h-3" />
            </span>
            <span className="text-xs text-slate-400 font-medium">Last 30 Days</span>
          </div>
        </div>

        {/* Card 3: No. of Resources */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>No. of Resources</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {data.kpi.no_of_resources}
            </span>
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span>02</span>
              <TrendingDown className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: No. of Regions */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>No. of Regions</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {data.kpi.no_of_regions || "12"}
            </span>
            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span>02</span>
              <TrendingDown className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: 2 Large Cards (Organisation Expenses Bar Chart & Potential Savings) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Organisation Expenses Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-sm">
                <span>Organisation Expenses</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 font-medium">Last 30 Days</p>
            </div>
            <button
              onClick={onNavigateToCostExplorer}
              className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              View All
            </button>
          </div>

          {/* Bar Chart with Red Budget Limit Line */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `$${val}k`}
                  domain={[0, 450]}
                  ticks={[0, 100, 200, 400]}
                />
                <Tooltip
                  formatter={(val: any) => [`$${val}k`, "Expense"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, fontSize: 12 }}
                />
                <ReferenceLine
                  y={data.organisation_expenses_chart.budget_limit / 1000}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: data.organisation_expenses_chart.budget_limit_k,
                    position: "right",
                    fill: "#ef4444",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="expense" fill="#4338ca" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend (Matching Image 1) */}
          <div className="flex items-center justify-center space-x-6 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-700" />
              <span>Expense in Dollars ($)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500" />
              <span>Organisation Budget Limit ({data.organisation_expenses_chart.budget_limit_k})</span>
            </div>
          </div>
        </div>

        {/* Right: Potential Savings & 3 Cards */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-sm">
                <span>Potential Savings</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 font-medium">Last 30 Days</p>
            </div>
            <button
              onClick={onNavigateToIdle}
              className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              View All
            </button>
          </div>

          {/* Forecast Label */}
          <div className="flex items-center justify-end text-xs text-slate-500 space-x-1">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>This Month Forecast <strong className="text-slate-900">{data.potential_savings.month_forecast_k}</strong></span>
          </div>

          {/* Segmented Savings Progress Bar (Matching Image 1) */}
          <div className="w-full bg-[#ede9fe] h-7 rounded-xl overflow-hidden flex p-1">
            <div className="bg-[#4338ca] h-full rounded-l-lg w-[32%]" />
            <div className="bg-[#818cf8] h-full rounded-r-lg w-[48%]" />
          </div>

          {/* Bar Legend */}
          <div className="flex items-center justify-center space-x-6 text-[11px] text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4338ca]" />
              <span>Savings Delivered <strong className="text-slate-900">{data.potential_savings.savings_delivered_k}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#818cf8]" />
              <span>Remaining Savings <strong className="text-slate-900">{data.potential_savings.remaining_savings_k}</strong></span>
            </div>
          </div>

          {/* 3 Metric Cards: Cost (Green), Security (Orange), Critical (Red) */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* Cost (Green) */}
            <div className="p-4 rounded-xl border border-emerald-500/60 bg-[#f0fdf4] text-center">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-emerald-800">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cost</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {data.potential_savings.cost_count}
              </div>
            </div>

            {/* Security (Orange) */}
            <div className="p-4 rounded-xl border border-amber-500/60 bg-[#fffbeb] text-center">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-amber-800">
                <Shield className="w-3.5 h-3.5" />
                <span>Security</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {data.potential_savings.security_count}
              </div>
            </div>

            {/* Critical (Red) */}
            <div className="p-4 rounded-xl border border-red-500/60 bg-[#fef2f2] text-center">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-red-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Critical</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </div>
              <div className="text-2xl font-black text-red-700 mt-2">
                {data.potential_savings.critical_count}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: 2 Cards (Top Resource Expenses & Policy Violations Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top resource expenses */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-sm">
                <span>Top resource expenses</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 font-medium">Last 30 Days</p>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center space-x-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 bg-slate-50 font-medium">
                <span>{resourceType}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
            <span>Resources</span>
            <span>Cost ($)</span>
          </div>

          {/* Horizontal Progress Bars List (Matching Image 1) */}
          <div className="space-y-3 pt-1">
            {data.top_resource_expenses.map((res, idx) => {
              const widthPct = Math.max((res.cost / maxResourceCost) * 100, 15);
              return (
                <div key={idx} className="flex items-center justify-between text-xs space-x-4">
                  <span className="font-semibold text-slate-700 w-44 truncate shrink-0">
                    {res.name}
                  </span>
                  <div className="flex-1 flex items-center justify-start space-x-2">
                    <div
                      className="bg-[#4338ca] h-4 rounded-full transition-all flex items-center justify-end px-2"
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="font-bold text-slate-800 font-mono text-[11px] shrink-0">
                      ${res.cost.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Policy Violations Table (Matching Image 1) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-sm">
                  <span>Policy Violations</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400 font-medium">Last 30 Days</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px]">
                    <th className="pb-2">Name ↑↓</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.policy_violations.map((violation) => (
                    <tr key={violation.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-800 block">
                          {violation.name}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Info className="w-2.5 h-2.5" />
                          <span>Last check: {violation.last_check}</span>
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-slate-700 text-[11px]">
                        {violation.type}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span>{violation.status_text}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer (Matching Image 1) */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span>Showing 4 of 50</span>
              <select className="border border-slate-200 rounded-lg px-2 py-0.5 text-xs bg-white">
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
            </div>

            <div className="flex items-center space-x-1 text-xs">
              <button className="p-1 hover:text-slate-800 flex items-center space-x-0.5">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button className="w-6 h-6 rounded-md bg-[#4338ca] text-white font-bold flex items-center justify-center text-xs">
                1
              </button>
              <button className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-xs">
                2
              </button>
              <button className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-xs">
                3
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-xs">
                98
              </button>
              <button className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-xs">
                99
              </button>
              <button className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-xs">
                100
              </button>
              <button className="p-1 hover:text-slate-800 flex items-center space-x-0.5">
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
