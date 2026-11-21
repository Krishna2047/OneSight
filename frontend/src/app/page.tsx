"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { DashboardOverview } from "@/components/DashboardOverview";
import { PoolsAttentionCard } from "@/components/PoolsAttentionCard";
import { AWSCostExplorer } from "@/components/AWSCostExplorer";
import { AWSKpiRibbon } from "@/components/AWSKpiRibbon";
import { AnomalyFeed } from "@/components/AnomalyFeed";
import { RCAModal } from "@/components/RCAModal";
import { AlertRulesView } from "@/components/AlertRulesView";
import { AgentChatConsole } from "@/components/AgentChatConsole";
import { IdleResourcesModal } from "@/components/IdleResourcesModal";
import { SimulateSpikeModal } from "@/components/SimulateSpikeModal";
import { ConnectAWSModal } from "@/components/ConnectAWSModal";
import { api } from "@/lib/api";
import {
  TenantItem,
  AWSAccountItem,
  DashboardSummaryResponse,
  AWSKpiSummary,
  CostExplorerResponse,
  AnomalyItem,
  AlertRuleItem,
  AlertHistoryItem,
  IdleResourceItem,
} from "@/types";
import { Loader2, AlertCircle } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("home");

  // Multi-tenant Organization State (100% Real AWS)
  const [tenants, setTenants] = useState<TenantItem[]>([
    {
      id: "tenant-acme",
      name: "AWS Account (476383094285)",
      slug: "aws-476383094285",
      plan: "ENTERPRISE",
      aws_accounts: [],
    },
  ]);
  const [currentTenantId, setCurrentTenantId] = useState("tenant-acme");

  const [accounts, setAccounts] = useState<AWSAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("ALL");

  // Dashboard Data matching Image 1
  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);

  // AWS Cost Explorer States
  const [groupBy, setGroupBy] = useState("service");
  const [days, setDays] = useState(30);
  const [ceData, setCeData] = useState<CostExplorerResponse | null>(null);
  const [kpi, setKpi] = useState<AWSKpiSummary | null>(null);

  // Other Platform States
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [rules, setRules] = useState<AlertRuleItem[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);
  const [idleResources, setIdleResources] = useState<IdleResourceItem[]>([]);
  const [idleTotalWaste, setIdleTotalWaste] = useState<number>(0);

  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isConnectAWSModalOpen, setIsConnectAWSModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenantsAndAccounts = useCallback(async () => {
    try {
      const tenantList = await api.getTenants();
      if (tenantList.length > 0) {
        setTenants(tenantList);
      }
      const accList = await api.getAWSAccounts(currentTenantId);
      setAccounts(accList);
    } catch (e) {
      console.warn("Using fallback tenants/accounts", e);
    }
  }, [currentTenantId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashRes, kpiData, ceRes, anomData, rulesData, histAlertData, idleData] =
        await Promise.all([
          api.getDashboardSummary(currentTenantId),
          api.getAWSKpi(currentTenantId, selectedAccountId),
          api.getCostExplorer(currentTenantId, groupBy, days, selectedAccountId),
          api.getAnomalies(currentTenantId, { account_id: selectedAccountId }),
          api.getAlertRules(currentTenantId),
          api.getAlertHistory(currentTenantId),
          api.getIdleResources(currentTenantId),
        ]);

      setDashboardData(dashRes);
      setKpi(kpiData);
      setCeData(ceRes);
      setAnomalies(anomData);
      setRules(rulesData);
      setAlertHistory(histAlertData);
      setIdleResources(idleData.idle_resources);
      setIdleTotalWaste(idleData.total_monthly_waste);
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      setError(err.message || "Failed to connect to OneSight billing engine.");
    } finally {
      setIsLoading(false);
    }
  }, [currentTenantId, selectedAccountId, groupBy, days]);

  useEffect(() => {
    loadTenantsAndAccounts();
  }, [loadTenantsAndAccounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTenantChange = (newTenantId: string) => {
    setCurrentTenantId(newTenantId);
    setSelectedAccountId("ALL");
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedAnomaly) return;
    try {
      await api.updateAnomalyStatus(selectedAnomaly.id, status, currentTenantId);
      setSelectedAnomaly((prev) => (prev ? { ...prev, status: status as any } : null));
      loadData();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleReRunRCA = async () => {
    if (!selectedAnomaly) return;
    try {
      const res = await api.triggerRCA(selectedAnomaly.id, currentTenantId);
      setSelectedAnomaly((prev) =>
        prev
          ? {
              ...prev,
              root_cause_summary: res.root_cause_summary,
              suspect_resources: res.suspect_resources,
              remediation_recommendations: res.remediation_recommendations,
              ai_confidence: res.ai_confidence,
            }
          : null
      );
      loadData();
    } catch (err: any) {
      alert("Failed to re-run RCA: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f4f6fa] text-slate-800 antialiased font-sans">
      {/* 1. Left Sidebar Navigation (Matching Image 5) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        anomalyCount={anomalies.length}
      />

      {/* 2. Main Area (Navbar + Canvas) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopNavbar
          tenants={tenants}
          currentTenantId={currentTenantId}
          onTenantChange={handleTenantChange}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          onSimulateSpike={() => setIsSimulateModalOpen(true)}
          onOpenConnectAWS={() => setIsConnectAWSModalOpen(true)}
        />

        {/* Canvas Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {isLoading && !dashboardData ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">
                Synchronizing FinOps telemetry & policy health...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3 max-w-md mx-auto my-12">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Telemetry Connection Failed</h3>
              <p className="text-xs text-slate-500">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div>
              {/* TAB 1: HOME (Matching Image 1 Screen) */}
              {activeTab === "home" && (
                <DashboardOverview
                  data={dashboardData}
                  onNavigateToCostExplorer={() => setActiveTab("cost-explorer")}
                  onNavigateToIdle={() => setActiveTab("idle")}
                  onNavigateToAnomalies={() => setActiveTab("anomalies")}
                />
              )}

              {/* TAB 2: POOLS (Matching Image 2 Screen) */}
              {activeTab === "pools" && (
                <PoolsAttentionCard
                  pools={dashboardData?.pools_requiring_attention || []}
                  onInspectPool={() => setActiveTab("cost-explorer")}
                />
              )}

              {/* TAB 3: COST EXPLORER (AWS Cost Explorer) */}
              {activeTab === "cost-explorer" && (
                <div className="space-y-6">
                  <AWSKpiRibbon
                    kpi={kpi}
                    idleMonthlyWaste={idleTotalWaste}
                    anomalyCount={anomalies.length}
                    onNavigateToAnomalies={() => setActiveTab("anomalies")}
                    onNavigateToIdle={() => setActiveTab("idle")}
                  />
                  <AWSCostExplorer
                    data={ceData}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    days={days}
                    onDaysChange={setDays}
                    isLoading={isLoading}
                    onConnectRealAWS={() => setIsConnectAWSModalOpen(true)}
                  />
                </div>
              )}

              {/* TAB 4: ANOMALIES (AWS Cost Anomaly Detection) */}
              {activeTab === "anomalies" && (
                <AnomalyFeed
                  anomalies={anomalies}
                  onSelectAnomaly={(anom) => setSelectedAnomaly(anom)}
                  onRefresh={loadData}
                  onSimulateSpike={() => setIsSimulateModalOpen(true)}
                />
              )}

              {/* TAB 5: POLICIES */}
              {activeTab === "policies" && (
                <div className="space-y-6">
                  {dashboardData && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">
                        Policy & Quota Violations
                      </h3>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px]">
                            <th className="pb-3">Name</th>
                            <th className="pb-3">Type</th>
                            <th className="pb-3 text-right">Violation Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dashboardData.policy_violations.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="py-3 font-semibold text-slate-800">{v.name}</td>
                              <td className="py-3 font-bold text-slate-700 text-[11px]">{v.type}</td>
                              <td className="py-3 text-right">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold">
                                  {v.status_text}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: IDLE WASTE AUDITOR */}
              {activeTab === "idle" && (
                <IdleResourcesModal
                  resources={idleResources}
                  totalMonthlyWaste={idleTotalWaste}
                  onRefresh={loadData}
                  tenantId={currentTenantId}
                />
              )}

              {/* TAB 7: ALERTS */}
              {activeTab === "alerts" && (
                <AlertRulesView
                  rules={rules}
                  history={alertHistory}
                  onRefresh={loadData}
                  tenantId={currentTenantId}
                />
              )}

              {/* TAB 8: AI COPILOT */}
              {activeTab === "agent" && (
                <AgentChatConsole tenantId={currentTenantId} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* AI Root Cause Analysis Modal */}
      <RCAModal
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
        onStatusChange={handleStatusChange}
        onReRunRCA={handleReRunRCA}
      />

      {/* Simulated Spike Injection Modal */}
      <SimulateSpikeModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        onSuccess={loadData}
        tenantId={currentTenantId}
        accounts={accounts}
      />

      {/* Real AWS Cost Explorer Connection Modal */}
      <ConnectAWSModal
        isOpen={isConnectAWSModalOpen}
        onClose={() => setIsConnectAWSModalOpen(false)}
        onSuccess={loadData}
        tenantId={currentTenantId}
      />
    </div>
  );
}
