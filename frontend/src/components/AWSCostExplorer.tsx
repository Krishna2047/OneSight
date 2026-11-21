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
} from "lucide-react";

interface AWSCostExplorerProps {
  data: CostExplorerResponse | null;
  groupBy: string;
  onGroupByChange: (newGroupBy: string) => void;
  days: number;
  onDaysChange: (newDays: number) => void;
  isLoading: boolean;
}

// Canonical AWS Cost Explorer dimension color palette
const AWS_PALETTE = [
  "#f59e0b", // Amber (EC2)
  "#3b82f6", // Blue (RDS)
  "#8b5cf6", // Purple (Bedrock GenAI)
  "#10b981", // Emerald (S3)
  "#ec4899", // Pink (NAT Gateway)
  "#06b6d4", // Cyan (ECS / Fargate)
  "#f97316", // Orange (Lambda)
  "#64748b", // Slate (Other)
];

export function AWSCostExplorer({
  data,
  groupBy,
  onGroupByChange,
  days,
  onDaysChange,
  isLoading,
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
        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 z-50 min-w-[200px] backdrop-blur">
          <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>Date: {point.date}</span>
            <span className="text-[10px] text-amber-400 font-mono">AWS</span>
          </p>
          <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
            {payload.map((entry: any, idx: number) => {
              if (entry.dataKey === "total") return null;
              return (
                <div key={idx} className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-300 truncate max-w-[130px]">{entry.name}:</span>
                  </div>
                  <span className="font-mono font-semibold text-white">
                    ${Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold text-white">
            <span>Daily Total:</span>
            <span className="text-amber-400 font-mono">
              ${point.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Cost Explorer Controls Toolbar */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">AWS Cost & Usage Explorer</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                CUR Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-dimensional cost analysis across linked member accounts and allocation tags
            </p>
          </div>

          {/* Time Range Selector & Chart Type Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Time range buttons */}
            <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700/80 text-xs">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => onDaysChange(d)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    days === d ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Last {d}d
                </button>
              ))}
            </div>

            {/* Chart type buttons */}
            <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700/80 text-xs">
              <button
                onClick={() => setChartType("stacked_bar")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chartType === "stacked_bar"
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Stacked Bar
              </button>
              <button
                onClick={() => setChartType("stacked_area")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chartType === "stacked_area"
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Stacked Area
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chartType === "line"
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Line
              </button>
            </div>
          </div>
        </div>

        {/* Group By Dimension Pills (Identical to AWS Cost Explorer!) */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 shrink-0 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Group By:</span>
          </span>
          {dimensionOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onGroupByChange(opt.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                groupBy === opt.id
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-white capitalize">
              Daily AWS Spend Segmented by {groupBy.replace("tag:", "Tag: ")}
            </span>
          </div>
          <span className="text-xs font-bold text-amber-400 font-mono">
            Period Total: ${data.total_period_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "stacked_bar" ? (
              <BarChart data={data.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  formatter={(val) => <span className="text-slate-300 font-medium">{val}</span>}
                />
                {data.dimensions_list.map((dim, idx) => (
                  <Bar
                    key={dim}
                    dataKey={dim}
                    stackId="aws"
                    fill={AWS_PALETTE[idx % AWS_PALETTE.length]}
                    radius={idx === data.dimensions_list.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : chartType === "stacked_area" ? (
              <AreaChart data={data.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  formatter={(val) => <span className="text-slate-300 font-medium">{val}</span>}
                />
                {data.dimensions_list.map((dim, idx) => (
                  <Area
                    key={dim}
                    type="monotone"
                    dataKey={dim}
                    stackId="1"
                    stroke={AWS_PALETTE[idx % AWS_PALETTE.length]}
                    fill={AWS_PALETTE[idx % AWS_PALETTE.length]}
                    fillOpacity={0.4}
                    strokeWidth={1.5}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={data.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  formatter={(val) => <span className="text-slate-300 font-medium">{val}</span>}
                />
                <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2.5} name="Total Daily Spend" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost & Usage Breakdown Table (AWS Cost Explorer Style) */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Cost & Usage Breakdown</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                Grouped by {groupBy.replace("tag:", "Tag: ")}
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Period-over-period variance analysis and share of total AWS spend
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search dimension..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Dimension</th>
                <th className="py-3 px-4 text-right">Incurred Total</th>
                <th className="py-3 px-4 text-right">Current Period</th>
                <th className="py-3 px-4 text-right">Prior Period</th>
                <th className="py-3 px-4 text-right">Variance ($ / %)</th>
                <th className="py-3 px-4 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredBreakdown.map((item, idx) => {
                const isPositive = item.variance_amount > 0;
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200 flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: AWS_PALETTE[idx % AWS_PALETTE.length] }}
                      />
                      <span className="truncate max-w-[240px]">{item.dimension_name}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white font-mono">
                      ${item.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono">
                      ${item.current_period_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      ${item.prior_period_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span
                        className={`inline-flex items-center space-x-0.5 font-semibold ${
                          isPositive ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>
                          {isPositive ? "+" : ""}
                          ${item.variance_amount.toFixed(2)} ({isPositive ? "+" : ""}
                          {item.variance_percent}%)
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="font-semibold text-slate-300 font-mono w-10 text-right">
                          {item.percentage_of_total}%
                        </span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${Math.min(item.percentage_of_total * 2, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
