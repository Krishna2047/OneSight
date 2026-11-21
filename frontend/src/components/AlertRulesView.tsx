"use client";

import React, { useState } from "react";
import { AlertRuleItem, AlertHistoryItem } from "@/types";
import { api } from "@/lib/api";
import {
  Bell,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Radio,
  Mail,
  Webhook,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

interface AlertRulesViewProps {
  rules: AlertRuleItem[];
  history: AlertHistoryItem[];
  onRefresh: () => void;
  tenantId?: string;
}

export function AlertRulesView({ rules, history, onRefresh, tenantId = "tenant-acme" }: AlertRulesViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testChannel, setTestChannel] = useState("SLACK");
  const [testWebhookUrl, setTestWebhookUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // New rule form state
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    metric_type: "DAILY_SPEND_SPIKE",
    threshold_value: 35.0,
    provider: "AWS",
    severity: "WARNING",
    channels: ["SLACK", "DISCORD"],
  });

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) return;
    try {
      await api.createAlertRule(tenantId, newRule as any);
      setShowAddModal(false);
      setNewRule({
        name: "",
        description: "",
        metric_type: "DAILY_SPEND_SPIKE",
        threshold_value: 35.0,
        provider: "AWS",
        severity: "WARNING",
        channels: ["SLACK", "DISCORD"],
      });
      onRefresh();
    } catch (err: any) {
      alert("Failed to create rule: " + err.message);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Delete this alert rule?")) return;
    try {
      await api.deleteAlertRule(id, tenantId);
      onRefresh();
    } catch (err: any) {
      alert("Failed to delete rule: " + err.message);
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.sendTestAlert(tenantId, {
        channel: testChannel,
        severity: "CRITICAL",
        title: "AWS Alert Diagnostic Verification",
        message: "Live test payload sent from OneSight AWS Alert Hub.",
        webhook_url: testWebhookUrl.trim() || undefined,
      });
      setTestResult(res);
      onRefresh();
    } catch (err: any) {
      setTestResult({ status: "ERROR", error: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Rules Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <span>Cloud Billing Alert Rules</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time threshold triggers dispatched across Slack, Discord, Webhooks, and Email
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test Notification</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Rule</span>
          </button>
        </div>
      </div>

      {/* Rules Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((r) => {
          const sevColor =
            r.severity === "CRITICAL"
              ? "text-red-400 border-red-500/30 bg-red-500/10"
              : r.severity === "HIGH" || r.severity === "WARNING"
              ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
              : "text-blue-400 border-blue-500/30 bg-blue-500/10";

          return (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sevColor}`}>
                      {r.severity}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-2">{r.name}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(r.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {r.description || "Threshold rule evaluating against incoming cloud cost metrics."}
                </p>

                <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Trigger Threshold</span>
                  <span className="font-bold text-slate-200">
                    {r.metric_type.includes("PERCENT") || r.metric_type.includes("SPIKE")
                      ? `>${r.threshold_value}% Surge`
                      : `>$${r.threshold_value.toLocaleString()} Spend`}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  {r.channels.map((ch, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-indigo-300 font-semibold"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] text-emerald-400 font-medium">● Active Ingestion</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert Dispatch History */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur">
        <h3 className="text-base font-bold text-white flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-indigo-400" />
          <span>Recent Alert Dispatch History & Payloads</span>
        </h3>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400">No alert dispatches logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
            {history.slice(0, 10).map((h) => (
              <div key={h.id} className="py-3 flex items-start justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[10px]">
                      {h.channel}
                    </span>
                    <span className="font-semibold text-slate-200">{h.title}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        h.status === "SENT" || h.status === "SIMULATED"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-red-400 bg-red-500/10"
                      }`}
                    >
                      {h.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-1">{h.message}</p>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0 ml-4">
                  {h.sent_at?.slice(11, 16)} UTC
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create Cloud Alert Rule</h3>
            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EC2 Spikes > $500/day"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Metric Trigger Type</label>
                <select
                  value={newRule.metric_type}
                  onChange={(e) => setNewRule({ ...newRule, metric_type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="DAILY_SPEND_SPIKE">Daily Spend Spike (% Above Baseline)</option>
                  <option value="MONTHLY_BUDGET_LIMIT">Monthly Multi-Cloud Budget ($ Limit)</option>
                  <option value="SINGLE_SERVICE_SPIKE">Service-Specific Spend ($ Limit)</option>
                  <option value="IDLE_WASTE_THRESHOLD">Total Idle Waste Threshold ($/mo)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Threshold Value</label>
                  <input
                    type="number"
                    step="any"
                    value={newRule.threshold_value}
                    onChange={(e) => setNewRule({ ...newRule, threshold_value: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Severity</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Reason and context for this alert rule..."
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Notification Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Send className="w-5 h-5 text-indigo-400" />
                <span>Test Alert Notification Dispatch</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Dispatch an immediate test alert to Slack, Discord, Webhook, or Email.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Channel</label>
                <div className="grid grid-cols-4 gap-2">
                  {["SLACK", "DISCORD", "WEBHOOK", "EMAIL"].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setTestChannel(ch)}
                      className={`py-2 px-3 rounded-lg border font-semibold text-center transition-colors ${
                        testChannel === ch
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Optional Webhook URL (leave empty to test simulation payload)
                </label>
                <input
                  type="text"
                  placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                  value={testWebhookUrl}
                  onChange={(e) => setTestWebhookUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
                />
              </div>

              {testResult && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payload Generated & Dispatched ({testResult.result_status})</span>
                  </div>
                  <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto max-h-36">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isSendingTest}
                onClick={handleSendTest}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? "Dispatching..." : `Send to ${testChannel}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
