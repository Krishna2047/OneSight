"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Cloud,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Key,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Lock,
} from "lucide-react";

interface ConnectAWSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
}

export function ConnectAWSModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
}: ConnectAWSModalProps) {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [roleArn, setRoleArn] = useState("");
  const [days, setDays] = useState(30);

  const [isLoading, setIsLoading] = useState(false);
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedPolicy, setCopiedPolicy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen, tenantId]);

  const checkStatus = async () => {
    try {
      const res = await api.getAWSLiveStatus(tenantId);
      setLiveStatus(res);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      setResultMsg({ type: "error", text: "Please enter both AWS Access Key ID and Secret Access Key." });
      return;
    }

    setIsLoading(true);
    setResultMsg(null);

    try {
      const res = await api.connectAWSCredentials(tenantId, {
        access_key_id: accessKeyId.trim(),
        secret_access_key: secretAccessKey.trim(),
        session_token: sessionToken.trim() || undefined,
        region: region.trim() || "us-east-1",
        role_arn: roleArn.trim() || undefined,
        sync_immediately: true,
        days: days,
      });

      if (res.status === "SUCCESS") {
        setResultMsg({
          type: "success",
          text: `Connected to AWS Account ${res.account_id || ""}! Real Cost Explorer records successfully synchronized.`,
        });
        await checkStatus();
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        setResultMsg({ type: "error", text: res.message || "Failed to connect to AWS Cost Explorer." });
      }
    } catch (err: any) {
      setResultMsg({ type: "error", text: err.message || "Network error connecting to AWS." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncOnly = async () => {
    setIsLoading(true);
    setResultMsg(null);
    try {
      const res = await api.syncLiveAWS(tenantId, days);
      if (res.success) {
        setResultMsg({
          type: "success",
          text: `Synced ${res.records_synced} real AWS records (${res.period})! Total invoice spend: $${res.total_spend}.`,
        });
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setResultMsg({ type: "error", text: res.message || "Sync failed." });
      }
    } catch (err: any) {
      setResultMsg({ type: "error", text: err.message || "Sync error." });
    } finally {
      setIsLoading(false);
    }
  };

  const iamPolicyExample = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetAnomalies"
      ],
      "Resource": "*"
    }
  ]
}`;

  const copyPolicy = () => {
    navigator.clipboard.writeText(iamPolicyExample);
    setCopiedPolicy(true);
    setTimeout(() => setCopiedPolicy(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-slate-900">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <Cloud className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">Connect Real AWS Cost Explorer API</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Live Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Query actual AWS Cost and Usage Reports (CUR), daily spend, and account dimensions using Boto3
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

        {/* Live Status Badge */}
        <div className="p-6 space-y-5 text-xs">
          {liveStatus && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                liveStatus.is_connected
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    liveStatus.is_connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <div>
                  <div className="font-bold text-sm">
                    {liveStatus.is_connected
                      ? `Connected to Real AWS (Account: ${liveStatus.account_id || "Live"})`
                      : "No Live AWS Credentials Connected"}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {liveStatus.is_connected
                      ? `Found ${liveStatus.verification?.services_count || 0} active services in your live AWS organization.`
                      : "Enter an IAM Access Key or assume role below to stream real AWS Cost Explorer telemetry."}
                  </div>
                </div>
              </div>

              {liveStatus.is_connected && (
                <button
                  type="button"
                  onClick={handleSyncOnly}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Sync Now</span>
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>AWS Access Key ID</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>AWS Secret Access Key</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">AWS Default Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="us-east-1"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="text-[10px] text-slate-400 block">
                  Note: AWS Cost Explorer endpoint is global (us-east-1).
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Days of Historical Invoices</label>
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={14}>Last 14 Days</option>
                  <option value={30}>Last 30 Days (Recommended)</option>
                  <option value={60}>Last 60 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>(Optional) Cross-Account IAM Role ARN</span>
                <span className="text-[10px] text-slate-400 font-normal">For Organizations Payer / Linked accounts</span>
              </label>
              <input
                type="text"
                placeholder="arn:aws:iam::112233445566:role/OneSightFinOpsRole"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Status Feedback */}
            {resultMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                  resultMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                <div className="font-bold flex items-center space-x-1.5">
                  {resultMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{resultMsg.type === "success" ? "Connected Successfully" : "Connection Failed"}</span>
                </div>
                <div className="mt-1">{resultMsg.text}</div>
              </div>
            )}

            {/* Required IAM Permissions Box */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Required IAM Policy</span>
                </span>
                <button
                  type="button"
                  onClick={copyPolicy}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1 text-[11px]"
                >
                  {copiedPolicy ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPolicy ? "Copied" : "Copy IAM JSON"}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl text-emerald-400 font-mono text-[10px] overflow-x-auto">
                <pre>{iamPolicyExample}</pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting & Syncing...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Verify & Sync Real AWS Data</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
