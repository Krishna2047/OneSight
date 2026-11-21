"use client";

import React, { useState } from "react";
import { AWSAccountItem } from "@/types";
import { api } from "@/lib/api";
import { Zap, X, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

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
  const [accountId, setAccountId] = useState(accounts[0]?.account_id || "");
  const [serviceName, setServiceName] = useState("Amazon Bedrock (GenAI)");
  const [spikeCost, setSpikeCost] = useState(720.0);
  const [reason, setReason] = useState("Runaway GenAI batch evaluation loop");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const defaultAccId = accounts[0]?.account_id || "";

  const presets = [
    {
      label: "AWS Bedrock Runaway Token Surge ($720)",
      accountId: accounts[1]?.account_id || defaultAccId,
      service: "Amazon Bedrock (GenAI)",
      cost: 720.0,
      reason: "Automated batch prompt evaluation script executed without token rate limiter",
    },
    {
      label: "AWS NAT Gateway Cross-AZ Egress ($420)",
      accountId: defaultAccId,
      service: "AWS NAT Gateway",
      cost: 420.0,
      reason: "Container backups transferred multi-GB images through NAT instead of VPC Endpoint",
    },
    {
      label: "Amazon EC2 Runaway Auto-Scaling Scale-Out ($580)",
      accountId: defaultAccId,
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
        reason: reason,
      });
      setResult(res);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      alert("Error simulating spike: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Zap className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Simulate Real-Time AWS Cost Spike</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inject a synthetic anomaly to test statistical detection & agentic AI RCA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Presets */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Quick Incident Presets</label>
            <div className="space-y-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all flex items-center justify-between group"
                >
                  <span className="font-medium text-slate-800 group-hover:text-indigo-600">{p.label}</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 font-semibold">Apply</span>
                </button>
              ))}
            </div>
          </div>

          {/* Linked Account Selector */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Target Linked Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {accounts.map((acc) => (
                <option key={acc.account_id} value={acc.account_id}>
                  {acc.account_name} ({acc.account_id})
                </option>
              ))}
            </select>
          </div>

          {/* Service Name & Spike Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">AWS Service</label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Spike Amount ($)</label>
              <input
                type="number"
                step="any"
                required
                value={spikeCost}
                onChange={(e) => setSpikeCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Synthetic Reason / Culprit */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Root Cause Scenario</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {result && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Spike Injected Successfully!</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Triggered Z-score deviation. Autonomous AI RCA generated diagnostic report.
              </p>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Injecting Spike..." : "Trigger Cost Spike"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
