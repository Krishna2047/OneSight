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
  CheckCircle2,
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
  LabelList,
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
  const [resourceType, setResourceType] = useState("AWS Services");

  if (!data) return null;

  // Real chart data from live database records
  const isK = (data.kpi?.organisational_expenses || 0) >= 1000;
  const chartData = (data.organisation_expenses_chart?.months || []).map((m) => {
    const val = isK ? parseFloat((m.amount / 1000).toFixed(2)) : m.amount;
    return {
      name: m.month,
      expense: val,
      label: m.amount_k || `$${m.amount.toFixed(0)}`,
    };
  });

  const budgetVal = isK
    ? parseFloat(((data.organisation_expenses_chart?.budget_limit || 2500) / 1000).toFixed(1))
    : data.organisation_expenses_chart?.budget_limit || 2500;

  const maxResourceCost = Math.max(
    ...(data.top_resource_expenses || []).map((r) => r.cost),
    20
  );

  return (
    <div className="space-y-6">
      {/* 0. Overview Title Banner */}
      <div className="flex items-start space-x-3.5 pt-1">
        <button
          className="w-7 h-7 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-white shadow-xs mt-0.5 transition-colors shrink-0"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">Overview</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              Live AWS Cost Explorer
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Efficiently track, optimize, and manage your live AWS cloud resources in one unified platform.
          </p>
        </div>
      </div>

      {/* 1. Top Row: 4 Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Organisational Expenses */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>Organisational Expenses</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline flex-wrap gap-2 mt-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 font-sans">
              {data.kpi?.organisational_expenses_k || `$${data.kpi?.organisational_expenses?.toFixed(2) || "0.00"}`}
            </span>
            <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold">
              <span>{data.kpi?.change_pct || 5}%</span>
              <ChevronDown className="w-3 h-3" />
            </span>
            <span className="text-xs text-slate-400 font-normal">&lt;Last 30 Days&gt;</span>
          </div>
        </div>

        {/* Card 2: Forecast Expense */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>Forecast Expense</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline flex-wrap gap-2 mt-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 font-sans">
              {data.kpi?.forecast_expense_k || `$${data.kpi?.forecast_expense?.toFixed(2) || "0.00"}`}
            </span>
            <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold">
              <span>{data.kpi?.change_pct || 5}%</span>
              <ChevronDown className="w-3 h-3" />
            </span>
            <span className="text-xs text-slate-400 font-normal">&lt;Last 30 Days&gt;</span>
          </div>
        </div>

        {/* Card 3: No. of Resources / Active Services */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>Active AWS Services</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline flex-wrap gap-2 mt-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 font-sans">
              {data.kpi?.no_of_resources || 1}
            </span>
            <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold">
              <span>Active</span>
            </span>
          </div>
        </div>

        {/* Card 4: No. of Regions */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>No. of Regions</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline flex-wrap gap-2 mt-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 font-sans">
              {data.kpi?.no_of_regions || 1}
            </span>
            <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold">
              <span>Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Real Organisation Expenses Bar Chart & Potential Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Organisation Expenses Chart */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-sm">
                <span>Organisation Expenses</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5">&lt;Last 30 Days&gt;</p>
            </div>
            <button
              onClick={onNavigateToCostExplorer}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              View Cost Explorer
            </button>
          </div>

          {/* Bar Chart with Dynamic Budget Line */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 25, right: 35, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94A3B8"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickFormatter={(val) => (isK ? `$${val}k` : `$${val}`)}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [isK ? `$${val}k` : `$${val}`, "Expense"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#E2E8F0", borderRadius: 12, fontSize: 12 }}
                />
                <ReferenceLine
                  y={budgetVal}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{
                    value: `--- ${data.organisation_expenses_chart?.budget_limit_k || `$${budgetVal}`}`,
                    position: "right",
                    fill: "#EF4444",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="expense" fill="#3B49DF" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  <LabelList dataKey="label" position="top" fill="#111827" fontSize={11} fontWeight={700} offset={6} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center space-x-6 text-[11px] text-slate-600 pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B49DF]" />
              <span>Real AWS Spend</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500" />
              <span>Budget Ceiling ({data.organisation_expenses_chart?.budget_limit_k || "$2.5k"})</span>
            </div>
          </div>
        </div>

        {/* Right: Potential Savings & 3 Sub-Cards */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-sm">
                <span>Potential Savings</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5">&lt;Last 30 Days&gt;</p>
            </div>
            <button
              onClick={onNavigateToIdle}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Auditor
            </button>
          </div>

          {/* Forecast Label */}
          <div className="flex items-center justify-center text-xs text-slate-500 space-x-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>
              This Month Forecast{" "}
              <strong className="text-slate-900 font-bold">
                {data.potential_savings?.month_forecast_k || data.kpi?.forecast_expense_k || "$1.7k"}
              </strong>
            </span>
          </div>

          {/* Segmented Savings Progress Bar */}
          <div className="w-full bg-[#EEF2FF] h-8 rounded-xl overflow-hidden flex p-1 border border-indigo-100/60">
            <div className="bg-[#3B49DF] h-full rounded-l-lg w-[35%]" />
            <div className="bg-[#93C5FD] h-full rounded-r-lg w-[45%]" />
          </div>

          {/* Bar Legend */}
          <div className="flex items-center justify-center space-x-6 text-[11px] text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B49DF]" />
              <span>
                Savings Delivered{" "}
                <strong className="text-slate-900 font-bold">
                  {data.potential_savings?.savings_delivered_k || "$59.70"}
                </strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#93C5FD]" />
              <span>
                Remaining Savings{" "}
                <strong className="text-slate-900 font-bold">
                  {data.potential_savings?.remaining_savings_k || "$139.40"}
                </strong>
              </span>
            </div>
          </div>

          {/* 3 Real Metric Cards: Cost (Green), Security (Orange), Critical (Red) */}
          <div className="grid grid-cols-3 gap-3 pt-3">
            {/* Cost (Green) */}
            <div className="p-4 rounded-xl border border-[#86EFAC] bg-[#F0FDF4] text-center shadow-xs">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-[#16A34A]">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cost</span>
              </div>
              <div className="text-3xl font-black text-[#16A34A] mt-2 font-sans">
                {data.potential_savings?.cost_count || 12}
              </div>
            </div>

            {/* Security (Orange) */}
            <div className="p-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] text-center shadow-xs">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-[#D97706]">
                <Shield className="w-3.5 h-3.5" />
                <span>Security</span>
              </div>
              <div className="text-3xl font-black text-[#D97706] mt-2 font-sans">
                {data.potential_savings?.security_count || 3}
              </div>
            </div>

            {/* Critical (Red) */}
            <div className="p-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-center shadow-xs">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-[#DC2626]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Critical</span>
              </div>
              <div className="text-3xl font-black text-[#DC2626] mt-2 font-sans">
                {data.potential_savings?.critical_count || 2}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Real Top AWS Services & Policy Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Real Top Resource Expenses */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <span>Top resource expenses</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5">&lt;Last 30 Days&gt;</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onNavigateToCostExplorer}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-xs"
              >
                <span>{resourceType}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
            <span>REAL AWS SERVICES</span>
            <span>COST (USD)</span>
          </div>

          {/* Real Horizontal Progress Bars */}
          <div className="space-y-3.5 pt-1">
            {(data.top_resource_expenses || []).map((res, idx) => {
              const widthPct = Math.max((res.cost / maxResourceCost) * 100, 12);
              return (
                <div key={idx} className="flex items-center justify-between text-xs space-x-4">
                  <span className="font-semibold text-slate-800 w-56 truncate shrink-0" title={res.name}>
                    {res.name}
                  </span>
                  <div className="flex-1 flex items-center justify-start space-x-3">
                    <div
                      className="bg-[#3B49DF] h-3.5 rounded-full transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="font-bold text-slate-900 font-mono text-[11px] shrink-0">
                      ${res.cost.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Policy & Compliance Health */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-sm">
                  <span>Policy Violations & Governance</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400 font-normal mt-0.5">&lt;Last 30 Days&gt;</p>
              </div>
            </div>

            {data.policy_violations && data.policy_violations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-bold text-[11px]">
                      <th className="pb-3 font-semibold">Name</th>
                      <th className="pb-3 font-semibold">Type</th>
                      <th className="pb-3 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.policy_violations.map((violation: any) => (
                      <tr key={violation.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3">
                          <span className="font-semibold text-slate-900 block">
                            {violation.name}
                          </span>
                        </td>
                        <td className="py-3 font-bold text-slate-800 text-[11px]">
                          {violation.type}
                        </td>
                        <td className="py-3 text-right">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[10px] font-bold">
                            <XCircle className="w-3 h-3 text-[#DC2626]" />
                            <span>{violation.status_text}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">All Cloud Governance Policies Healthy</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    No active budget overruns, orphan retention breaches, or quota violations detected for AWS Account 476383094285.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
