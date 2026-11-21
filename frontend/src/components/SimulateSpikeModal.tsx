"use client";

import React, { useState } from "react";
import { AWSAccountItem } from "@/types";
import { api } from "@/lib/api";
import { Zap, X, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SimulateSpikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  accounts: AWSAccountItem[];
}

export function SimulateSpikeModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  accounts,
}: SimulateSpikeModalProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.account_id || "112233445566");
  const [serviceName, setServiceName] = useState("Amazon Bedrock (GenAI)");
  const [spikeCost, setSpikeCost] = useState(720.0);
  const [reason, setReason] = useState("Runaway GenAI batch evaluation loop");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const presets = [
    {
      label: "AWS Bedrock Runaway Token Surge ($720)",
      accountId: accounts[1]?.account_id || accounts[0]?.account_id || "223344556677",
      service: "Amazon Bedrock (GenAI)",
      cost: 720.0,
      reason: "Automated batch prompt evaluation script executed without token rate limiter",
    },
    {
      label: "AWS NAT Gateway Cross-AZ Egress ($420)",
      accountId: accounts[0]?.account_id || "112233445566",
      service: "AWS NAT Gateway",
      cost: 420.0,
      reason: "Container backups transferred multi-GB images through NAT instead of VPC Endpoint",
    },
    {
      label: "Amazon EC2 Runaway Auto-Scaling Scale-Out ($580)",
      accountId: accounts[0]?.account_id || "112233445566",
      service: "Amazon Elastic Compute Cloud - Compute",
      cost: 580.0,
      reason: "Flapping health check on ECS worker pool spawned 16 un-needed on-demand c5.2xlarge instances",
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setAccountId(p.accountId);
    setServiceName(p.service);
    setSpikeCost(p.cost);
    setReason(p.reason);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await api.simulateSpike(tenantId, {
        account_id: accountId,
        service_name: serviceName,
        spike_cost: spikeCost,
        reason,
      });
      setResult(res);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      alert("Spike simulation failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Simulate AWS Cost Anomaly Spike</h3>
              <p className="text-xs text-slate-400">
                Tests AWS statistical anomaly detection, AI RCA diagnosis, and alert dispatchers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Realistic AWS Scenarios
          </label>
          <div className="grid grid-cols-1 gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between ${
                  serviceName === p.service
                    ? "bg-amber-500/20 border-amber-500/40 text-white font-semibold"
                    : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span>{p.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 font-mono text-amber-400">
                  ${p.cost}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Linked AWS Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_name} ({acc.account_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Spike Cost ($)</label>
              <input
                type="number"
                step="any"
                value={spikeCost}
                onChange={(e) => setSpikeCost(parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Target AWS Service</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Scenario Reason / Incident Context</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {result && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                AWS Spike injected! Anomaly #{result.anomaly_id} flagged and alerts dispatched.
              </span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center space-x-1.5 shadow-lg shadow-red-500/20"
            >
              <Zap className="w-4 h-4" />
              <span>{isSubmitting ? "Evaluating..." : "Inject & Detect"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
