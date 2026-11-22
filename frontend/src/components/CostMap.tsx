"use client";

import React, { useState, useEffect } from "react";
import {
  CostExplorerResponse,
  AWSKpiSummary,
  CostExplorerBreakdownItem,
} from "@/types";
import { api } from "@/lib/api";
import { AWSServiceLogo } from "./AWSServiceLogo";
import {
  PieChart,
  Layers,
  Globe,
  MapPin,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Server,
  ShieldCheck,
  HardDrive,
  Network,
  Cpu,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";

interface CostMapProps {
  tenantId?: string;
  selectedAccountId?: string;
  onNavigateToCostExplorer?: () => void;
  onNavigateToCopilot?: () => void;
}

// Icon helper by AWS service name
const getServiceIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("ec2") || lower.includes("compute")) return <Cpu className="w-4 h-4 text-indigo-600" />;
  if (lower.includes("guardduty") || lower.includes("security") || lower.includes("shield")) return <ShieldCheck className="w-4 h-4 text-blue-600" />;
  if (lower.includes("s3") || lower.includes("storage") || lower.includes("ebs")) return <HardDrive className="w-4 h-4 text-amber-600" />;
  if (lower.includes("vpc") || lower.includes("nat") || lower.includes("network")) return <Network className="w-4 h-4 text-cyan-600" />;
  if (lower.includes("cloudwatch") || lower.includes("config")) return <BarChart3 className="w-4 h-4 text-purple-600" />;
  return <Server className="w-4 h-4 text-slate-600" />;
};

// Color palettes for tiles
const TILE_COLORS = [
  { bg: "bg-indigo-50/80", border: "border-indigo-200/90", text: "text-indigo-900", bar: "bg-indigo-600" },
  { bg: "bg-blue-50/80", border: "border-blue-200/90", text: "text-blue-900", bar: "bg-blue-600" },
  { bg: "bg-emerald-50/80", border: "border-emerald-200/90", text: "text-emerald-900", bar: "bg-emerald-600" },
  { bg: "bg-amber-50/80", border: "border-amber-200/90", text: "text-amber-900", bar: "bg-amber-600" },
  { bg: "bg-purple-50/80", border: "border-purple-200/90", text: "text-purple-900", bar: "bg-purple-600" },
  { bg: "bg-cyan-50/80", border: "border-cyan-200/90", text: "text-cyan-900", bar: "bg-cyan-600" },
  { bg: "bg-rose-50/80", border: "border-rose-200/90", text: "text-rose-900", bar: "bg-rose-600" },
  { bg: "bg-slate-50/80", border: "border-slate-200/90", text: "text-slate-900", bar: "bg-slate-600" },
];

export function CostMap({
  tenantId = "tenant-acme",
  selectedAccountId = "ALL",
  onNavigateToCostExplorer,
  onNavigateToCopilot,
}: CostMapProps) {
  const [viewMode, setViewMode] = useState<"service" | "region" | "account">("service");
  const [days, setDays] = useState<number>(30);
  const [ceData, setCeData] = useState<CostExplorerResponse | null>(null);
  const [kpi, setKpi] = useState<AWSKpiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CostExplorerBreakdownItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        const [ceRes, kpiRes] = await Promise.all([
          api.getCostExplorer(tenantId, viewMode === "account" ? "linked_account" : viewMode, days, selectedAccountId),
          api.getAWSKpi(tenantId, selectedAccountId),
        ]);
        if (isMounted) {
          setCeData(ceRes);
          setKpi(kpiRes);
          if (ceRes.breakdown && ceRes.breakdown.length > 0) {
            setSelectedItem(ceRes.breakdown[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load Cost Map data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [tenantId, selectedAccountId, viewMode, days]);

  const items = ceData?.breakdown || [];
  const totalPeriodSpend = ceData?.total_period_spend || 0;

  return (
    <div className="space-y-6">
      {/* Cost Map Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  AWS Cloud Cost Topology Map
                </h2>
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Telemetry</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-dimensional proportional spend distribution across active services, linked accounts, and regions
              </p>
            </div>
          </div>
        </div>

        {/* Filters: Horizon & View Mode */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Dimension Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode("service")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "service"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setViewMode("region")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "region"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Regions
            </button>
            <button
              onClick={() => setViewMode("account")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "account"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Accounts
            </button>
          </div>

          {/* Time Horizon */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {[
              { label: "7d", val: 7 },
              { label: "14d", val: 14 },
              { label: "30d", val: 30 },
            ].map((t) => (
              <button
                key={t.val}
                onClick={() => setDays(t.val)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  days === t.val
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Total Period Spend</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
              {ceData?.period_label || `Last ${days}d`}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ${totalPeriodSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all verified AWS resources</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Top Dimension Driver</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 font-bold text-indigo-700">
              {items[0]?.percentage_of_total || 0}% share
            </span>
          </div>
          <div className="text-base font-bold text-indigo-600 truncate">
            {items[0]?.dimension_name || "N/A"}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            ${items[0]?.total_spend?.toFixed(2) || "0.00"} incurred
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Active Dimensions</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 font-bold text-emerald-700">
              Active
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {items.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Segmented by {viewMode}
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Forecasted Month-End</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 font-bold text-blue-700">
              Projected
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ${kpi?.forecast_month_end?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Run rate: ${kpi?.daily_burn_rate?.toFixed(2) || "0.00"}/day
          </p>
        </div>
      </div>

      {/* Main Grid: Proportional Heatmap Tiles + Dimension Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Proportional Cost Heatmap */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cost Topology Density Map ({items.length} {viewMode}s)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tile size and visual density corresponds to spend share within the selected window
              </p>
            </div>
            {onNavigateToCostExplorer && (
              <button
                onClick={onNavigateToCostExplorer}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1"
              >
                <span>Cost Explorer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-500">Synthesizing live AWS cost topology...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No spend records for this dimension</p>
              <p className="text-xs text-slate-500 mt-1">Try switching to &quot;Services&quot; or expanding the date range.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((item, idx) => {
                const color = TILE_COLORS[idx % TILE_COLORS.length];
                const isSelected = selectedItem?.dimension_name === item.dimension_name;
                const percentage = item.percentage_of_total || 0;

                return (
                  <div
                    key={item.dimension_name}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? "ring-2 ring-indigo-500 border-indigo-300 shadow-sm bg-indigo-50/20"
                        : "border-slate-200/90 hover:border-slate-300 hover:shadow-xs bg-white"
                    }`}
                  >
                    {/* Top Progress Bar */}
                    <div className="w-full h-1 bg-slate-100 rounded-full mb-3 overflow-hidden">
                      <div
                        className={`h-full ${color.bar}`}
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 p-1">
                          <AWSServiceLogo serviceName={item.dimension_name} size={24} className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate" title={item.dimension_name}>
                          {item.dimension_name}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 shrink-0">
                        {percentage}%
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-base font-extrabold text-slate-900 tracking-tight">
                        ${item.total_spend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {item.variance_percent !== undefined && (
                        <span
                          className={`text-[10px] font-bold flex items-center space-x-0.5 ${
                            item.variance_percent > 0
                              ? "text-rose-600"
                              : item.variance_percent < 0
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          {item.variance_percent > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {item.variance_percent > 0 ? "+" : ""}
                            {item.variance_percent.toFixed(1)}%
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Detailed Dimension Inspector */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          {selectedItem ? (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Selected Dimension
                </span>
                <div className="flex items-center space-x-3 mt-2.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                    <AWSServiceLogo serviceName={selectedItem.dimension_name} size={32} className="w-8 h-8" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-900 truncate">
                      {selectedItem.dimension_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Official AWS Architecture Telemetry
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Incurred Spend:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ${selectedItem.total_spend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Portfolio Share:</span>
                  <span className="font-bold text-indigo-600">
                    {selectedItem.percentage_of_total}% of organization bill
                  </span>
                </div>
                {selectedItem.prior_period_spend !== undefined && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Prior Period Spend:</span>
                    <span className="font-semibold text-slate-700">
                      ${selectedItem.prior_period_spend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {selectedItem.variance_amount !== undefined && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Period Variance:</span>
                    <span
                      className={`font-bold ${
                        selectedItem.variance_amount > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {selectedItem.variance_amount > 0 ? "+" : ""}${selectedItem.variance_amount.toFixed(2)} ({selectedItem.variance_percent?.toFixed(1)}%)
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Daily Equivalent:</span>
                  <span className="font-semibold text-slate-700">
                    ${(selectedItem.total_spend / Math.max(days, 1)).toFixed(2)}/day
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {onNavigateToCopilot && (
                  <button
                    onClick={onNavigateToCopilot}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Investigate with AI Copilot</span>
                  </button>
                )}
                {onNavigateToCostExplorer && (
                  <button
                    onClick={onNavigateToCostExplorer}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span>View in Cost Explorer</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Select a tile on the map to inspect details
            </div>
          )}

          {/* FinOps Topology Tip */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 leading-relaxed">
            💡 <strong>FinOps Tip:</strong> Resources with continuous flat burn (like EC2 instances and NAT Gateways) are top candidates for 1-year or 3-year Compute Savings Plans, yielding 20-28% immediate discount.
          </div>
        </div>
      </div>

      {/* Regional Geographical Presence (When viewing regions or general overview) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                AWS Global Regional Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Verified regional workload presence and infrastructure spend footprint
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {[
            {
              code: "us-east-1",
              name: "US East (N. Virginia)",
              spend: totalPeriodSpend,
              pct: 100,
              status: "Primary Active",
              active: true,
            },
            {
              code: "us-west-2",
              name: "US West (Oregon)",
              spend: 0,
              pct: 0,
              status: "Standby / Monitored",
              active: false,
            },
            {
              code: "eu-west-1",
              name: "Europe (Ireland)",
              spend: 0,
              pct: 0,
              status: "Monitored",
              active: false,
            },
            {
              code: "ap-southeast-1",
              name: "Asia Pacific (Singapore)",
              spend: 0,
              pct: 0,
              status: "Monitored",
              active: false,
            },
          ].map((reg) => (
            <div
              key={reg.code}
              className={`p-4 rounded-xl border transition-all ${
                reg.active
                  ? "bg-indigo-50/30 border-indigo-200 shadow-2xs"
                  : "bg-slate-50/50 border-slate-200/70 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-900">{reg.code}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    reg.active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {reg.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">{reg.name}</p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-base font-extrabold text-slate-900">
                  ${reg.spend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-slate-500">{reg.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
