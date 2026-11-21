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
  const [resourceType, setResourceType] = useState("Resources");
  const [page, setPage] = useState(1);

  if (!data) return null;

  const chartData = [
    { name: "August", expense: 165.2, label: "$165.2k" },
    { name: "Sep", expense: 39.7, label: "$39.7k" },
    { name: "Sep (forecast)", expense: 122.6, label: "$122.6k" },
  ];

  const maxResourceCost = Math.max(...data.top_resource_expenses.map((r) => r.cost), 25);

  return (
    <div className="space-y-6">
      {/* 0. Overview Title Banner (Matching Screenshot exactly) */}
      <div className="flex items-start space-x-3.5 pt-1">
        <button
          className="w-7 h-7 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-white shadow-xs mt-0.5 transition-colors shrink-0"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">Overview</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Efficiently track, optimize, and manage your cloud resources in one unified platform.
          </p>
        </div>
      </div>

      {/* 1. Top Row: 4 Metric Cards (Matching Image 1) */}
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
            <span className="text-3xl font-black tracking-tight text-slate-900">
              $39.7k
            </span>
            <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold">
              <span>10%</span>
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
            <span className="text-3xl font-black tracking-tight text-slate-900">
              $112.6k
            </span>
            <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold">
              <span>10%</span>
              <ChevronDown className="w-3 h-3" />
            </span>
            <span className="text-xs text-slate-400 font-normal">&lt;Last 30 Days&gt;</span>
          </div>
        </div>

        {/* Card 3: No. of Resources */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <span>No. of Resources</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </span>
          </div>
          <div className="flex items-baseline flex-wrap gap-2 mt-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              1000
            </span>
            <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold">
              <span>02</span>
              <ChevronDown className="w-3 h-3" />
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
            <span className="text-3xl font-black tracking-tight text-slate-900">
              1000
            </span>
            <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-bold">
              <span>02</span>
              <ChevronDown className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: 2 Large Cards (Organisation Expenses Bar Chart & Potential Savings) */}
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
              View All
            </button>
          </div>

          {/* Bar Chart with Red Budget Limit Line */}
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
                  tickFormatter={(val) => `$${val}k`}
                  domain={[0, 450]}
                  ticks={[0, 100, 200, 400]}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`$${val}k`, "Expense"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#E2E8F0", borderRadius: 12, fontSize: 12 }}
                />
                <ReferenceLine
                  y={397.5}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{
                    value: "--- $397.5k",
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

          {/* Chart Legend (Matching Image 1) */}
          <div className="flex items-center justify-center space-x-6 text-[11px] text-slate-600 pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B49DF]" />
              <span>Expense in Dollars ($)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500" />
              <span>Organisation Budget Limit ($397.5k)</span>
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
              View All
            </button>
          </div>

          {/* Forecast Label */}
          <div className="flex items-center justify-center text-xs text-slate-500 space-x-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>This Month Forecast <strong className="text-slate-900 font-bold">$112.6k</strong></span>
          </div>

          {/* Segmented Savings Progress Bar (Matching Image 1) */}
          <div className="w-full bg-[#EEF2FF] h-8 rounded-xl overflow-hidden flex p-1 border border-indigo-100/60">
            <div className="bg-[#3B49DF] h-full rounded-l-lg w-[32%]" />
            <div className="bg-[#93C5FD] h-full rounded-r-lg w-[48%]" />
          </div>

          {/* Bar Legend */}
          <div className="flex items-center justify-center space-x-6 text-[11px] text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B49DF]" />
              <span>Savings Delivered <strong className="text-slate-900 font-bold">$24.3k</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#93C5FD]" />
              <span>Remaining Savings <strong className="text-slate-900 font-bold">$88.3k</strong></span>
            </div>
          </div>

          {/* 3 Metric Cards: Cost (Green), Security (Orange), Critical (Red) */}
          <div className="grid grid-cols-3 gap-3 pt-3">
            {/* Cost (Green) */}
            <div className="p-4 rounded-xl border border-[#86EFAC] bg-[#F0FDF4] text-center shadow-xs">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-[#16A34A]">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cost</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </div>
              <div className="text-3xl font-black text-[#16A34A] mt-2 font-sans">
                100
              </div>
            </div>

            {/* Security (Orange) */}
            <div className="p-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] text-center shadow-xs">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-[#D97706]">
                <Shield className="w-3.5 h-3.5" />
                <span>Security</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </div>
              <div className="text-3xl font-black text-[#D97706] mt-2 font-sans">
                200
              </div>
            </div>

            {/* Critical (Red) */}
            <div className="p-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-center shadow-xs">
              <div className="flex items-center justify-center space-x-1 text-xs font-bold text-[#DC2626]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Critical</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </div>
              <div className="text-3xl font-black text-[#DC2626] mt-2 font-sans">
                300
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: 2 Cards (Top Resource Expenses & Policy Violations Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top resource expenses */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <span>Top resource expenses</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500 flex items-center space-x-0.5 cursor-pointer hover:text-slate-800">
                  <span>Show Views</span>
                  <ChevronDown className="w-3 h-3" />
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5">&lt;Last 30 Days&gt;</p>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center space-x-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-xs">
                <span>{resourceType}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
            <span>RESOURCES</span>
            <span>COST ($)</span>
          </div>

          {/* Horizontal Progress Bars List (Matching Image 1) */}
          <div className="space-y-3.5 pt-1">
            {[
              { name: "Azure Storage", cost: 20.00 },
              { name: "Amazon DynamoDB", cost: 19.00 },
              { name: "Amazon API Gateway", cost: 18.00 },
              { name: "Elastic Load Balanci...", cost: 17.00 },
              { name: "Amazon Elastic Co...", cost: 16.00 },
              { name: "Cloud Storage", cost: 14.00 },
              { name: "AWS Lambda", cost: 10.00 },
            ].map((res, idx) => {
              const widthPct = Math.max((res.cost / 20.00) * 100, 15);
              return (
                <div key={idx} className="flex items-center justify-between text-xs space-x-4">
                  <span className="font-semibold text-slate-800 w-44 truncate shrink-0">
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

        {/* Right: Policy Violations Table (Matching Image 1) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-sm">
                  <span>Policy Violations</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400 font-normal mt-0.5">&lt;Last 30 Days&gt;</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-bold text-[11px]">
                    <th className="pb-3 font-semibold">Name ↑↓</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      id: 1,
                      name: "Buckets count in us-east-1",
                      last_check: "1 day ago",
                      type: "QUOTA",
                      status_text: "34",
                    },
                    {
                      id: 2,
                      name: "Enviroments total budget",
                      last_check: "1 day ago",
                      type: "BUDGET",
                      status_text: "$234.90",
                    },
                    {
                      id: 3,
                      name: "Instance tagging policy",
                      last_check: "1 day ago",
                      type: "TAGGING",
                      status_text: "9 violations right now",
                    },
                    {
                      id: 4,
                      name: "Instance tagging policy",
                      last_check: "1 day ago",
                      type: "TAGGING",
                      status_text: "9 violations right now",
                    },
                  ].map((violation) => (
                    <tr key={violation.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3">
                        <span className="font-semibold text-slate-900 block">
                          {violation.name}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Info className="w-3 h-3" />
                          <span>Last check: {violation.last_check}</span>
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
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span>Showing 4 of 50</span>
              <button className="flex items-center space-x-1 px-2 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700">
                <span>10</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center space-x-1.5 font-medium">
              <button className="px-2 py-1 text-slate-400 hover:text-slate-700 font-semibold flex items-center space-x-1">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button className="w-6 h-6 rounded-full bg-[#3B49DF] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                1
              </button>
              <button className="w-6 h-6 rounded-full text-slate-600 hover:bg-slate-100 flex items-center justify-center">
                2
              </button>
              <button className="w-6 h-6 rounded-full text-slate-600 hover:bg-slate-100 flex items-center justify-center">
                3
              </button>
              <span className="text-slate-400 px-1">...</span>
              <button className="w-6 h-6 rounded-full text-slate-600 hover:bg-slate-100 flex items-center justify-center">
                98
              </button>
              <button className="w-6 h-6 rounded-full text-slate-600 hover:bg-slate-100 flex items-center justify-center">
                99
              </button>
              <button className="w-6 h-6 rounded-full text-slate-600 hover:bg-slate-100 flex items-center justify-center">
                100
              </button>
              <button className="px-2 py-1 text-slate-600 hover:text-slate-900 font-semibold flex items-center space-x-1">
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
