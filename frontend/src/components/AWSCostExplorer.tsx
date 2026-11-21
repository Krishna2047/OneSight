"use client";

import React, { useState } from "react";
import { CostExplorerResponse } from "@/types";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Layers,
  BarChart3,
  TrendingUp,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
  PieChart,
  Shield,
} from "lucide-react";

interface AWSCostExplorerProps {
  data: CostExplorerResponse | null;
  groupBy: string;
  onGroupByChange: (newGroupBy: string) => void;
  days: number;
  onDaysChange: (newDays: number) => void;
  isLoading: boolean;
  onConnectRealAWS?: () => void;
}

// Canonical AWS Cost Explorer dimension color palette
const AWS_PALETTE = [
  "#4F46E5", // Indigo (EC2)
  "#0EA5E9", // Sky Blue (RDS)
  "#8B5CF6", // Purple (Bedrock GenAI)
  "#10B981", // Emerald (S3)
  "#F59E0B", // Amber (NAT Gateway)
  "#06B6D4", // Cyan (ECS / Fargate)
  "#F97316", // Orange (Lambda)
  "#64748B", // Slate (Other)
];

export function AWSCostExplorer({
  data,
  groupBy,
  onGroupByChange,
  days,
  onDaysChange,
  isLoading,
  onConnectRealAWS,
}: AWSCostExplorerProps) {
  const [chartType, setChartType] = useState<"stacked_bar" | "stacked_area" | "line">("stacked_bar");
  const [searchTable, setSearchTable] = useState("");

  const dimensionOptions = [
    { id: "service", label: "Service" },
    { id: "account", label: "Linked Account" },
    { id: "region", label: "Region" },
    { id: "usage_type", label: "Usage Type" },
    { id: "tag:Team", label: "Tag: Team" },
    { id: "tag:Environment", label: "Tag: Environment" },
  ];

  if (!data) return null;

  const filteredBreakdown = data.breakdown.filter((item) =>
    item.dimension_name.toLowerCase().includes(searchTable.toLowerCase())
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white/95 border border-slate-200/90 p-4 rounded-xl shadow-xl text-xs space-y-1.5 z-50 min-w-[220px] backdrop-blur">
          <p className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>Date: {point.date}</span>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 font-semibold px-1.5 py-0.5 rounded">AWS CUR</span>
          </p>
          <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
            {payload.map((entry: any, idx: number) => {
              if (entry.dataKey === "total") return null;
              return (
                <div key={idx} className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-600 truncate max-w-[130px]">{entry.name}:</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900">
                    ${Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
          {point.total !== undefined && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-slate-900">
              <span>Day Total:</span>
              <span className="font-mono text-indigo-600">${Number(point.total).toFixed(2)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Dimension & Range Controls Toolbar */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Header Title */}
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">AWS Cost & Usage Explorer</h3>
                <p className="text-xs text-slate-500">
                  Multi-dimensional cost analysis across linked member accounts, usage types, and allocation tags
                </p>
              </div>
            </div>
          </div>

          {/* Right Toolbar Controls: Time Range & Chart Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onConnectRealAWS && (
              <button
                onClick={onConnectRealAWS}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                title="1-Click AWS STS Account Onboarding"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>1-Click AWS Onboarding</span>
              </button>
            )}

            {/* Time Range Pills */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
              {[
                { label: "Last 7d", val: 7 },
                { label: "Last 14d", val: 14 },
                { label: "Last 30d", val: 30 },
              ].map((r) => (
                <button
                  key={r.val}
                  onClick={() => onDaysChange(r.val)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    days === r.val
                      ? "bg-white text-indigo-600 font-semibold shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Chart Type Toggles */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
              <button
                onClick={() => setChartType("stacked_bar")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  chartType === "stacked_bar"
                    ? "bg-white text-indigo-600 font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stacked Bar
              </button>
              <button
                onClick={() => setChartType("stacked_area")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  chartType === "stacked_area"
                    ? "bg-white text-indigo-600 font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stacked Area
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  chartType === "line"
                    ? "bg-white text-indigo-600 font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Line
              </button>
            </div>
          </div>
        </div>

        {/* Group By Dimension Selector */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Group By:</span>
          </span>
          {dimensionOptions.map((dim) => {
            const isActive = groupBy === dim.id;
            return (
              <button
                key={dim.id}
                onClick={() => onGroupByChange(dim.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-slate-200/80"
                }`}
              >
                {dim.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Daily AWS Spend Segmented By {dimensionOptions.find((d) => d.id === groupBy)?.label || groupBy}
            </h4>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Period Total:</span>
            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              ${data.total_period_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "stacked_bar" ? (
              <BarChart data={data.timeline} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                {data.dimensions_list.map((cat, idx) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    name={cat}
                    stackId="a"
                    fill={AWS_PALETTE[idx % AWS_PALETTE.length]}
                    radius={idx === data.dimensions_list.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : chartType === "stacked_area" ? (
              <AreaChart data={data.timeline} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                {data.dimensions_list.map((cat, idx) => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    name={cat}
                    stackId="1"
                    stroke={AWS_PALETTE[idx % AWS_PALETTE.length]}
                    fill={AWS_PALETTE[idx % AWS_PALETTE.length]}
                    fillOpacity={0.7}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={data.timeline} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                {data.dimensions_list.map((cat, idx) => (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    name={cat}
                    stroke={AWS_PALETTE[idx % AWS_PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs">
          {data.dimensions_list.map((cat, idx) => (
            <div key={cat} className="flex items-center space-x-1.5">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: AWS_PALETTE[idx % AWS_PALETTE.length] }}
              />
              <span className="text-slate-700 font-medium">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost and Usage Breakdown Variance Table */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Cost & Usage Breakdown</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed period-over-period variance analysis and percentage share of total AWS invoice
            </p>
          </div>

          {/* Table Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter dimensions..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Dimension Name</th>
                <th className="py-3 px-5 text-right">Current Spend</th>
                <th className="py-3 px-5 text-right">Prior Spend</th>
                <th className="py-3 px-5 text-right">Variance ($)</th>
                <th className="py-3 px-5 text-right">Variance (%)</th>
                <th className="py-3 px-5 text-right">Share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching records found
                  </td>
                </tr>
              ) : (
                filteredBreakdown.map((row, idx) => {
                  const isPositive = row.variance_amount > 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900 flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: AWS_PALETTE[idx % AWS_PALETTE.length] }}
                        />
                        <span className="truncate max-w-[260px]">{row.dimension_name}</span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                        ${row.current_period_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-500">
                        ${row.prior_period_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`py-3.5 px-5 text-right font-mono font-semibold ${
                          isPositive ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {isPositive ? "+" : "-"}${Math.abs(row.variance_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isPositive
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {row.variance_percent > 0 ? `+${row.variance_percent}%` : `${row.variance_percent}%`}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-700">
                        {row.percentage_of_total.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
