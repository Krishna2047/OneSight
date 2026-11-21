"use client";

import React, { useState } from "react";
import { IdleResourceItem } from "@/types";
import { api } from "@/lib/api";
import {
  Trash2,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Globe,
  Radio,
  Server,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface IdleResourcesModalProps {
  resources: IdleResourceItem[];
  totalMonthlyWaste: number;
  onRefresh: () => void;
  tenantId?: string;
}

export function IdleResourcesModal({
  resources,
  totalMonthlyWaste,
  onRefresh,
  tenantId = "tenant-acme",
}: IdleResourcesModalProps) {
  const [remediatingId, setRemediatingId] = useState<string | null>(null);
  const [remediationMsg, setRemediationMsg] = useState<string | null>(null);

  const handleRemediate = async (res: IdleResourceItem) => {
    if (!confirm(`Are you sure you want to remediate ${res.resource_name}? This will snapshot and safely release the idle asset.`)) {
      return;
    }

    setRemediatingId(res.resource_id);
    setRemediationMsg(null);
    try {
      const result = await api.remediateIdle(tenantId, res.resource_id);
      setRemediationMsg(result.message);
      onRefresh();
    } catch (err: any) {
      alert("Remediation error: " + err.message);
    } finally {
      setRemediatingId(null);
    }
  };

  const getResourceIcon = (type: string) => {
    if (type.includes("EBS") || type.includes("Disk")) return HardDrive;
    if (type.includes("NAT")) return Radio;
    if (type.includes("IP")) return Globe;
    return Server;
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner Card */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Idle & Orphaned Cloud Asset Auditor</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Continuously detects unattached EBS volumes, idle NAT Gateways, and abandoned Elastic IPs to recover cloud spend
              </p>
            </div>
          </div>

          {/* Waste Totals */}
          <div className="flex items-center space-x-3">
            <div className="bg-rose-50 border border-rose-200/80 px-4 py-2.5 rounded-xl text-right">
              <span className="text-[10px] font-semibold text-rose-700 block uppercase tracking-wider">Total Monthly Waste</span>
              <span className="text-lg font-bold font-mono text-rose-700">
                ${totalMonthlyWaste.toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200/80 px-4 py-2.5 rounded-xl text-right">
              <span className="text-[10px] font-semibold text-emerald-700 block uppercase tracking-wider">Annualized Savings</span>
              <span className="text-lg font-bold font-mono text-emerald-700">
                ${(totalMonthlyWaste * 12).toLocaleString(undefined, { minimumFractionDigits: 2 })}/yr
              </span>
            </div>
          </div>
        </div>

        {remediationMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{remediationMsg}</span>
          </div>
        )}
      </div>

      {/* Idle Resources List */}
      <div className="space-y-3.5">
        {resources.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200/90 rounded-2xl shadow-sm">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-900">Zero Idle Cloud Waste Identified</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              All EBS storage volumes, NAT Gateways, and Elastic IPs are attached, actively routing production traffic, and properly tagged.
            </p>
          </div>
        ) : (
          resources.map((res) => {
            const Icon = getResourceIcon(res.resource_type);
            const isRemediating = remediatingId === res.resource_id;

            return (
              <div
                key={res.id}
                className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Resource Info */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {res.provider}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{res.resource_name}</h4>
                        <span className="text-xs text-slate-500">({res.resource_type})</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          ID: {res.resource_id}
                        </span>
                        <span>•</span>
                        <span>Region: {res.region}</span>
                        <span>•</span>
                        <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                          Idle for {res.details?.unattached_days || res.details?.idle_days || 14} days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Waste Cost & Remediation CTA */}
                  <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono text-rose-600">
                        ${res.monthly_waste_cost.toFixed(2)}
                        <span className="text-xs font-normal text-slate-400">/mo</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemediate(res)}
                      disabled={isRemediating}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isRemediating ? "Remediating..." : "Auto-Remediate"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
