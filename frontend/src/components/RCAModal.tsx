"use client";

import React, { useState } from "react";
import { AnomalyItem } from "@/types";
import { AWSServiceLogo } from "./AWSServiceLogo";
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
  ArrowRight,
  AlertTriangle,
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
    if (anomaly.service_name.includes("NAT Gateway")) {
      return "aws ec2 create-vpc-endpoint --vpc-id vpc-081829e --service-name com.amazonaws.us-east-1.s3 --route-table-ids rtb-03487f";
    }
    if (anomaly.service_name.includes("Elastic Compute") || anomaly.service_name.includes("EC2")) {
      return "aws autoscaling update-auto-scaling-group --auto-scaling-group-name asg-ecs-prod-workers --max-size 8 --desired-capacity 4";
    }
    return `# Inspect and tune metrics for ${anomaly.service_name}\naws cloudwatch get-metric-statistics --namespace AWS/${anomaly.service_name} --metric-name EstimatedCharges`;
  };

  const cliCmd = getCliCommand();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-900">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center p-1.5 shadow-2xs">
              <AWSServiceLogo serviceName={anomaly.service_name} size={28} className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">AI Root Cause Analysis (RCA)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {anomaly.ai_confidence ? `${Math.round(anomaly.ai_confidence * 100)}% Confidence` : "High Confidence"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated forensic audit of {anomaly.service_name} in {anomaly.account_name}
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

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Key Financial Impact Ribbon */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Cost Spike Delta</span>
              <div className="text-base font-bold font-mono text-rose-600 mt-0.5">
                +${anomaly.cost_delta.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Baseline Cost</span>
              <div className="text-base font-bold font-mono text-slate-700 mt-0.5">
                ${anomaly.baseline_cost.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Deviation</span>
              <div className="text-base font-bold font-mono text-rose-600 mt-0.5">
                +{anomaly.deviation_percent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Root Cause Diagnosis */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Forensic Diagnosis & Culprit Mechanism</span>
            </h4>
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-slate-800 leading-relaxed">
              {anomaly.root_cause_summary || "Autonomous agent has flagged an anomalous deviation against 14-day rolling Z-score."}
            </div>
          </div>

          {/* Offending Cloud Resource ARNs */}
          {anomaly.suspect_resources && anomaly.suspect_resources.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Suspect AWS Resource ARNs</span>
              </h4>
              <div className="space-y-1.5">
                {anomaly.suspect_resources.map((arn, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 flex items-center justify-between"
                  >
                    <span className="truncate">{arn}</span>
                    <button
                      onClick={() => handleCopy(arn)}
                      className="ml-2 text-slate-400 hover:text-indigo-600 p-1"
                      title="Copy ARN"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          {anomaly.remediation_recommendations && anomaly.remediation_recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Remediation Plan</span>
              </h4>
              <div className="space-y-2">
                {anomaly.remediation_recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 flex items-start space-x-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended AWS CLI Mitigation Command */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span>AWS CLI Remediation Command</span>
              </h4>
              <button
                onClick={() => handleCopy(cliCmd)}
                className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1 text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Command"}</span>
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto shadow-inner">
              <code>{cliCmd}</code>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-semibold">Change Status:</span>
            <select
              value={anomaly.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="DETECTED">DETECTED</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReRun}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {isRefreshing ? "Analyzing..." : "Re-Run AI RCA"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
