"use client";

import React, { useState } from "react";
import { Info, TrendingUp, Server, Eye, ChevronLeft, ChevronRight, Cloud } from "lucide-react";

interface PoolItem {
  id: number;
  name: string;
  provider: string;
  limit: number;
  expenses_this_month: number;
  expenses_change_pct: number;
  forecast_this_month: number;
  forecast_change_pct: number;
  owner: string;
  status: string;
}

interface PoolsAttentionCardProps {
  pools: PoolItem[];
  onInspectPool?: (pool: PoolItem) => void;
}

export function PoolsAttentionCard({ pools, onInspectPool }: PoolsAttentionCardProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case "AWS":
        return { label: "AWS", color: "bg-amber-500 text-slate-950 font-bold" };
      case "GCP":
        return { label: "GCP", color: "bg-sky-500 text-white font-bold" };
      case "AZURE":
        return { label: "Azure", color: "bg-blue-600 text-white font-bold" };
      default:
        return { label: "Cloud", color: "bg-indigo-600 text-white font-bold" };
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
      {/* Header (Matching Image 2) */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-sm">
            <span>Pools requiring attention</span>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Last 30 Days</p>
        </div>
        <button className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          View All
        </button>
      </div>

      {/* Pools Table (Matching Image 2) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px]">
              <th className="pb-3 px-2">Name</th>
              <th className="pb-3 px-2">Limit</th>
              <th className="pb-3 px-2">Expenses this month ↑↓</th>
              <th className="pb-3 px-2">Forecast this month</th>
              <th className="pb-3 px-2">Owner</th>
              <th className="pb-3 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pools.map((pool) => {
              const badge = getProviderBadge(pool.provider);
              return (
                <tr key={pool.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] ${badge.color}`}>
                        {badge.label[0]}
                      </span>
                      <span className="font-semibold text-slate-800">{pool.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 font-mono font-semibold text-slate-700">
                    ${pool.limit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-2">
                    <div className="flex items-center space-x-1.5 font-mono">
                      <span className="font-bold text-slate-800">
                        ${pool.expenses_this_month.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold">
                        {pool.expenses_change_pct}% ^
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-2">
                    <div className="flex items-center space-x-1.5 font-mono">
                      <span className="font-semibold text-slate-700">
                        ${pool.forecast_this_month.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold">
                        {pool.forecast_change_pct}% ^
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-slate-600 font-medium">
                    {pool.owner}
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    <div className="flex items-center justify-end space-x-2 text-slate-400">
                      <button className="p-1 hover:text-slate-800 rounded">
                        <Server className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onInspectPool?.(pool)}
                        className="p-1 hover:text-indigo-600 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (Matching Image 2) */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span>Showing 10 of 50</span>
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
  );
}
