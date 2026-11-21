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
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Idle & Orphaned Cloud Asset Auditor</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Detects unattached volumes, idle VPC NAT Gateways, and abandoned IPs to recover cloud spend.
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
          <div>
            <span className="text-[10px] text-slate-400 block">Total Monthly Waste</span>
            <span className="text-lg font-bold text-rose-400">
              ${totalMonthlyWaste.toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
            </span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <span className="text-[10px] text-slate-400 block">Annualized Potential Savings</span>
            <span className="text-lg font-bold text-emerald-400">
              ${(totalMonthlyWaste * 12).toLocaleString(undefined, { minimumFractionDigits: 2 })}/yr
            </span>
          </div>
        </div>
      </div>

      {remediationMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{remediationMsg}</span>
        </div>
      )}

      {/* Resource Table / Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur">
        <div className="divide-y divide-slate-800/80">
          {resources.map((item) => {
            const Icon = getResourceIcon(item.resource_type);
            const isRemediated = item.status === "REMEDIATED";

            return (
              <div
                key={item.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 ${
                      isRemediated
                        ? "bg-slate-800 text-slate-500 border-slate-700"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                        {item.provider}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-200">
                        {item.resource_name}
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        ({item.resource_type})
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-mono">
                      ID: <span className="text-slate-300">{item.resource_id}</span> • Region:{" "}
                      <span className="text-slate-300">{item.region}</span>
                    </p>

                    {item.details && (
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
                        {Object.entries(item.details).map(([k, v], idx) => (
                          <span key={idx} className="bg-slate-800/60 px-2 py-0.5 rounded">
                            {k}: <strong className="text-slate-300">{String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-rose-400 block">
                      ${item.monthly_waste_cost.toFixed(2)}/mo
                    </span>
                    <span className="text-[10px] text-slate-500">Incurring Unused Cost</span>
                  </div>

                  {isRemediated ? (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Remediated</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemediate(item)}
                      disabled={remediatingId === item.resource_id}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {remediatingId === item.resource_id
                          ? "Executing..."
                          : "Auto-Remediate"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
