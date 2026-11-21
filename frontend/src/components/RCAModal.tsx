"use client";

import React, { useState } from "react";
import { AnomalyItem } from "@/types";
import {
  X,
  Sparkles,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  TrendingUp,
  Cpu,
  Layers,
} from "lucide-react";

interface RCAModalProps {
  anomaly: AnomalyItem | null;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onReRunRCA: () => void;
}

export function RCAModal({
  anomaly,
  onClose,
  onStatusChange,
  onReRunRCA,
}: RCAModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!anomaly) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReRun = async () => {
    setIsRefreshing(true);
    await onReRunRCA();
    setIsRefreshing(false);
  };

  const getCliCommand = () => {
    if (anomaly.service_name.includes("Bedrock")) {
      return "aws bedrock put-model-invocation-logging-configuration --logging-config cloudWatchConfig={logGroupName=/aws/bedrock/invocations}";
    }
    if (anomaly.service_name.includes("BigQuery")) {
      return "bq update --require_partition_filter=true gcp-data-platform-9821:analytics_raw.clickstream_events";
    }
    if (anomaly.service_name.includes("NAT Gateway")) {
      return "aws ec2 create-vpc-endpoint --vpc-id vpc-081829e --service-name com.amazonaws.us-east-1.s3 --route-table-ids rtb-03487f";
    }
    if (anomaly.service_name.includes("Azure OpenAI")) {
      return "az cognitiveservices account update --name corp-openai-eastus --resource-group rg-ai --set properties.customSubDomainName=corp-openai";
    }
    return `# Inspect and tune metrics for ${anomaly.service_name}\ncloud logs filter --service "${anomaly.service_name}" --region "${anomaly.region}"`;
  };

  const cliCmd = getCliCommand();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">AI Root Cause Analysis</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {anomaly.ai_confidence ? `${Math.round(anomaly.ai_confidence * 100)}% Confidence` : "High Confidence"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                FinOps Autonomous Diagnosis for {anomaly.provider} • {anomaly.service_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Anomaly Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div>
              <span className="text-[11px] text-slate-400">Baseline Cost</span>
              <p className="text-sm font-bold text-slate-200 mt-0.5">
                ${anomaly.baseline_cost.toFixed(2)}/day
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">Spike Cost</span>
              <p className="text-sm font-bold text-red-400 mt-0.5">
                ${anomaly.current_cost.toFixed(2)}/day
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">Cost Deviation</span>
              <p className="text-sm font-bold text-amber-400 mt-0.5 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+${anomaly.cost_delta.toFixed(2)} (+{anomaly.deviation_percent.toFixed(1)}%)</span>
              </p>
            </div>
          </div>

          {/* Root Cause Summary */}
          <div>
            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Diagnosed Root Cause</span>
            </h4>
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-sm text-slate-200 leading-relaxed">
              {anomaly.root_cause_summary || "Autonomous RCA analysis is processing..."}
            </div>
          </div>

          {/* Suspect Resources */}
          {anomaly.suspect_resources && anomaly.suspect_resources.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Cpu className="w-4 h-4" />
                <span>Suspect Offending Cloud Resources</span>
              </h4>
              <div className="space-y-1.5">
                {anomaly.suspect_resources.map((res, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 font-mono text-xs text-sky-300 break-all flex items-center justify-between"
                  >
                    <span>{res}</span>
                    <button
                      onClick={() => handleCopy(res)}
                      className="p-1 hover:text-white transition-colors"
                      title="Copy resource ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remediation Recommendations */}
          {anomaly.remediation_recommendations && anomaly.remediation_recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Agent Remediation Action Plan</span>
              </h4>
              <ul className="space-y-2">
                {anomaly.remediation_recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 flex items-start space-x-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CLI Auto-Remediation Snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Executable Remediation Command</span>
              </h4>
              <button
                onClick={() => handleCopy(cliCmd)}
                className="text-xs font-medium text-slate-400 hover:text-white flex items-center space-x-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
              <code>{cliCmd}</code>
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Update Status:</span>
            <select
              value={anomaly.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="DETECTED">DETECTED</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReRun}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              {isRefreshing ? "Analyzing..." : "Re-Run RCA Agent"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
