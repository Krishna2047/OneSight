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
  X,
  Sparkles,
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
        webhook_url: testWebhookUrl || undefined,
        severity: "WARNING",
        title: "OneSight AWS Cost Anomaly Drill",
        message: "Automated alert verification delivered through OneSight Multi-Tenant Dispatcher.",
      });
      setTestResult(res);
      onRefresh();
    } catch (err: any) {
      setTestResult({ status: "FAILED", error: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "WARNING":
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Rules Header Card */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cloud Billing Alert Rules</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time threshold triggers dispatched across Slack, Discord, Webhooks, and Email
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setShowTestModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Test Notification</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rules Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getSeverityBadge(
                    rule.severity
                  )}`}
                >
                  {rule.severity}
                </span>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  title="Delete Rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mt-2">{rule.name}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rule.description}</p>

              {/* Threshold box */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Trigger Threshold</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {rule.metric_type.includes("SPIKE")
                    ? `>${rule.threshold_value}% Surge`
                    : `>$${rule.threshold_value.toLocaleString()} Spend`}
                </span>
              </div>
            </div>

            {/* Bottom Channels & Status */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {rule.channels.map((ch) => (
                  <span
                    key={ch}
                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold"
                  >
                    {ch}
                  </span>
                ))}
              </div>

              <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Ingestion</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Dispatch History Table */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900">Recent Alert Dispatch History & Payloads</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of automated notifications sent via Slack Block Kit, Discord Webhooks, and Email
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Rule Name</th>
                <th className="py-3 px-5">Channel</th>
                <th className="py-3 px-5">Severity</th>
                <th className="py-3 px-5">Title & Message</th>
                <th className="py-3 px-5">Dispatch Status</th>
                <th className="py-3 px-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No alert dispatches recorded yet
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">{h.rule_name}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-[10px] border border-slate-200">
                        {h.channel}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(
                          h.severity
                        )}`}
                      >
                        {h.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{h.title}</div>
                      <div className="text-slate-500 text-[11px] truncate">{h.message}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status === "DELIVERED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-slate-500 font-mono text-[11px]">
                      {h.sent_at ? new Date(h.sent_at).toLocaleTimeString() : "Just now"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Notification Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-900">Send Test Alert</h4>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Channel</label>
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="SLACK">Slack (Block Kit)</option>
                  <option value="DISCORD">Discord (Rich Embed)</option>
                  <option value="EMAIL">Email (HTML Digest)</option>
                  <option value="WEBHOOK">Generic Webhook (PagerDuty / Opsgenie)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Custom Webhook URL <span className="text-slate-400 font-normal">(Optional Override)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://hooks.slack.com/services/..."
                  value={testWebhookUrl}
                  onChange={(e) => setTestWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    testResult.status === "DISPATCHED" || testResult.result_status === "DELIVERED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  <div className="font-bold">Dispatch Status: {testResult.result_status || testResult.status}</div>
                  <div className="text-[11px] mt-0.5">{testResult.error || "Verified alert delivered successfully."}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                {isSendingTest ? <span>Sending...</span> : <span>Dispatch Now</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleCreateRule}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-900">Create Alert Rule</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Bedrock GenAI Token Surge (> $200/day)"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Alerts when daily spend exceeds baseline..."
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Metric Type</label>
                  <select
                    value={newRule.metric_type}
                    onChange={(e) => setNewRule({ ...newRule, metric_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="DAILY_SPEND_SPIKE">Daily Spend Spike (%)</option>
                    <option value="TOTAL_SPEND_THRESHOLD">Total Spend Threshold ($)</option>
                    <option value="ANOMALY_CONFIRMED">Anomaly Confirmed</option>
                    <option value="IDLE_WASTE_LIMIT">Idle Waste Limit ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Threshold Value</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newRule.threshold_value}
                    onChange={(e) => setNewRule({ ...newRule, threshold_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Severity</label>
                <select
                  value={newRule.severity}
                  onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="WARNING">Warning</option>
                  <option value="INFO">Info</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
              >
                Save Alert Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
