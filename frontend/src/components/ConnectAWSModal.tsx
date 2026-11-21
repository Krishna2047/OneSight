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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Terminal,
  Building2,
  Cpu,
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
  const [activeMode, setActiveMode] = useState<"sts" | "keys">("sts");

  // STS 1-Click State
  const [cftData, setCftData] = useState<{
    onesight_account_id: string;
    external_id: string;
    role_name: string;
    cloudformation_yaml: string;
    quick_create_url: string;
    cli_command: string;
    terraform_hcl: string;
  } | null>(null);

  const [stsRoleArn, setStsRoleArn] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [activeCodeTab, setActiveCodeTab] = useState<"cft" | "cli" | "tf">("cft");
  const [showCodeDetails, setShowCodeDetails] = useState(false);

  // Direct IAM Keys State
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [roleArn, setRoleArn] = useState("");

  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [resultMsg, setResultMsg] = useState<{
    type: "success" | "error";
    text: string;
    discovered?: any[];
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, tenantId]);

  const loadInitialData = async () => {
    try {
      const [statusRes, templateRes] = await Promise.all([
        api.getAWSLiveStatus(tenantId),
        api.getAWSOnboardingTemplate(tenantId),
      ]);
      setLiveStatus(statusRes);
      setCftData(templateRes);
    } catch (e) {
      console.error("Error loading onboarding data:", e);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadTemplate = () => {
    if (!cftData?.cloudformation_yaml) return;
    const blob = new Blob([cftData.cloudformation_yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "onesight-cft.yaml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  // Handle STS 1-Click Role Onboarding
  const handleOnboardSTS = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoleArn = stsRoleArn.trim() || (targetAccountId.trim() ? `arn:aws:iam::${targetAccountId.trim()}:role/OneSightCostOptimizerRole` : "");

    if (!finalRoleArn) {
      setResultMsg({
        type: "error",
        text: "Please provide the Role ARN (e.g. arn:aws:iam::123456789012:role/OneSightCostOptimizerRole) or enter your 12-digit AWS Account ID.",
      });
      return;
    }

    setIsLoading(true);
    setResultMsg(null);

    try {
      const res = await api.onboardSTSRole(tenantId, {
        role_arn: finalRoleArn,
        external_id: cftData?.external_id || `onesight-${tenantId}-finops-auth`,
        sync_immediately: true,
        days: days,
      });

      if (res.success) {
        setResultMsg({
          type: "success",
          text: `Onboarded AWS Account ${res.account_id}! Discovered ${res.discovered_accounts_count || 1} account(s) and synced real Cost Explorer billing records.`,
          discovered: res.discovered_accounts || [],
        });
        setTimeout(() => {
          onSuccess();
        }, 2200);
      } else {
        setResultMsg({
          type: "error",
          text: res.message || "Failed to assume STS Role. Please verify the CloudFormation stack deployed successfully.",
        });
      }
    } catch (err: any) {
      setResultMsg({
        type: "error",
        text: err.message || "Network error communicating with OneSight STS engine.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Direct Access Keys
  const handleConnectKeys = async (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-slate-900">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">AWS Single-Click Account Onboarding</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200">
                  STS Cross-Account
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Zero long-lived IAM keys. Connect securely using AWS STS AssumeRole and CloudFormation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: 1-Click STS vs Direct Keys */}
        <div className="px-6 pt-4 flex space-x-2 border-b border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveMode("sts")}
            className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center space-x-1.5 ${
              activeMode === "sts"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>1-Click STS Role (Recommended)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold">
              Fast & Secure
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("keys")}
            className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center space-x-1.5 ${
              activeMode === "keys"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>Direct IAM Access Keys</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-medium">
              Dev / Sandbox
            </span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Result Alert Banner */}
          {resultMsg && (
            <div
              className={`p-4 rounded-xl border flex flex-col space-y-2 text-xs font-medium animate-in fade-in ${
                resultMsg.type === "success"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                  : "bg-red-50/80 border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-start space-x-2.5">
                {resultMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{resultMsg.text}</span>
              </div>
              {resultMsg.discovered && resultMsg.discovered.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 space-y-1 pl-6">
                  <p className="font-bold text-[11px] text-emerald-900">
                    Discovered Linked Accounts:
                  </p>
                  {resultMsg.discovered.map((acc: any) => (
                    <div key={acc.account_id} className="flex items-center space-x-2 text-[11px]">
                      <Building2 className="w-3 h-3 text-emerald-600" />
                      <span className="font-semibold">{acc.account_name}</span>
                      <span className="text-slate-500 font-mono">({acc.account_id})</span>
                      {acc.is_management && (
                        <span className="text-[9px] px-1.5 rounded bg-emerald-200/80 text-emerald-900 font-bold">
                          Management Payer
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODE 1: 1-CLICK STS ROLE ONBOARDING */}
          {activeMode === "sts" ? (
            <div className="space-y-6">
              {/* Step 1: Trust Parameters Overview */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Step 1: OneSight Trust Parameters</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    External ID Prevents Confused Deputy
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-medium text-slate-400">OneSight SaaS Account</div>
                      <div className="font-mono font-bold text-slate-800">
                        {cftData?.onesight_account_id || "123456789012"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(cftData?.onesight_account_id || "123456789012", "saas_id")
                      }
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                    >
                      {copiedKey === "saas_id" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-medium text-slate-400">Tenant External ID</div>
                      <div className="font-mono font-bold text-slate-800 truncate max-w-[160px]">
                        {cftData?.external_id || `onesight-${tenantId}-finops-auth`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(cftData?.external_id || `onesight-${tenantId}-finops-auth`, "ext_id")
                      }
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                    >
                      {copiedKey === "ext_id" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Deploy CloudFormation in AWS Account */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Cloud className="w-3.5 h-3.5 text-amber-500" />
                    <span>Step 2: Deploy CloudFormation in your AWS Account</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Standard 15s Stack</span>
                </div>

                {/* Primary Dual Actions: Download & Open AWS Console */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="py-3 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>1. Download onesight-cft.yaml</span>
                  </button>

                  <a
                    href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/template"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all"
                  >
                    <span>2. Open AWS CloudFormation</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-90" />
                  </a>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Quick 30-Second Instructions in AWS Console:</p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>On the AWS page, select <strong>&quot;Upload a template file&quot;</strong> and choose the downloaded <code className="text-indigo-600 font-mono font-bold">onesight-cft.yaml</code>.</li>
                    <li>Click <strong>Next</strong>, keep default name <code className="text-slate-800 font-mono">OneSightCostOptimizerRole</code>, and click <strong>Next</strong>.</li>
                    <li>Check the box <code className="text-slate-800 font-mono">&quot;I acknowledge that AWS CloudFormation might create IAM resources&quot;</code> and click <strong>Submit</strong>.</li>
                  </ol>
                </div>

                {/* Collapsible View for YAML / CLI / Terraform */}
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCodeDetails(!showCodeDetails)}
                    className="w-full px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/80"
                  >
                    <span>Or deploy via AWS CLI or Terraform</span>
                    {showCodeDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {showCodeDetails && (
                    <div className="p-3 bg-slate-900 text-slate-100 space-y-2">
                      <div className="flex space-x-2 border-b border-slate-800 pb-2">
                        <button
                          type="button"
                          onClick={() => setActiveCodeTab("cft")}
                          className={`text-[11px] font-bold px-2 py-1 rounded ${
                            activeCodeTab === "cft" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          CloudFormation YAML
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCodeTab("cli")}
                          className={`text-[11px] font-bold px-2 py-1 rounded ${
                            activeCodeTab === "cli" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          AWS CLI
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCodeTab("tf")}
                          className={`text-[11px] font-bold px-2 py-1 rounded ${
                            activeCodeTab === "tf" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Terraform (HCL)
                        </button>
                      </div>

                      <div className="relative">
                        <pre className="text-[10px] font-mono overflow-x-auto max-h-48 p-2 text-slate-300">
                          {activeCodeTab === "cft" && cftData?.cloudformation_yaml}
                          {activeCodeTab === "cli" && cftData?.cli_command}
                          {activeCodeTab === "tf" && cftData?.terraform_hcl}
                        </pre>
                        <button
                          type="button"
                          onClick={() => {
                            const code =
                              activeCodeTab === "cft"
                                ? cftData?.cloudformation_yaml
                                : activeCodeTab === "cli"
                                ? cftData?.cli_command
                                : cftData?.terraform_hcl;
                            copyToClipboard(code || "", "code");
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                        >
                          {copiedKey === "code" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Enter Role ARN & Onboard */}
              <form onSubmit={handleOnboardSTS} className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Step 3: Connect & Auto-Discover Fleet</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      12-Digit AWS Account ID
                    </label>
                    <input
                      type="text"
                      placeholder="12-digit AWS Account ID"
                      value={targetAccountId}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setTargetAccountId(val);
                        if (val.length === 12 && /^\d+$/.test(val)) {
                          setStsRoleArn(`arn:aws:iam::${val}:role/OneSightCostOptimizerRole`);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400">Auto-fills the default Role ARN</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Historical Cost Lookback
                    </label>
                    <select
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value={30}>Last 30 Days (Standard)</option>
                      <option value={60}>Last 60 Days</option>
                      <option value={90}>Last 90 Days (Quarterly)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Deployed Role ARN
                  </label>
                  <input
                    type="text"
                    placeholder="arn:aws:iam::<ACCOUNT_ID>:role/OneSightCostOptimizerRole"
                    value={stsRoleArn}
                    onChange={(e) => setStsRoleArn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Assuming STS Role & Auto-Discovering Fleet...</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span>Verify STS Role & Auto-Discover Fleet</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* MODE 2: DIRECT IAM KEYS (DEV / SANDBOX) */
            <form onSubmit={handleConnectKeys} className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  For production environments, we recommend using the <strong>1-Click STS AssumeRole</strong> tab above.
                  Enter IAM access keys only for local testing or sandboxes.
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    AWS Access Key ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={accessKeyId}
                    onChange={(e) => setAccessKeyId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    AWS Secret Access Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    value={secretAccessKey}
                    onChange={(e) => setSecretAccessKey(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Region
                    </label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Historical Days
                    </label>
                    <select
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value={30}>Last 30 Days</option>
                      <option value={60}>Last 60 Days</option>
                      <option value={90}>Last 90 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying & Ingesting Cost Explorer Data...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Verify & Sync with IAM Keys</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Read-only permissions: ce:*, organizations:ListAccounts, sts:GetCallerIdentity</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
