import {
  TenantItem,
  AWSAccountItem,
  AWSKpiSummary,
  CostExplorerResponse,
  IdleResourceItem,
  AnomalyItem,
  AlertRuleItem,
  AlertHistoryItem,
} from "@/types";

const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `${window.location.protocol}//${host}:8000/api/v1`;
  }
  return "http://127.0.0.1:8000/api/v1";
};

async function fetchJson<T>(
  endpoint: string,
  tenantId: string = "tenant-acme",
  options?: RequestInit
): Promise<T> {
  const url = `${getApiBase()}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-ID": tenantId,
      ...options?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error (${res.status}): ${errorText}`);
  }

  return res.json();
}

export const api = {
  // Multi-Tenant Endpoints
  getTenants: () => fetchJson<TenantItem[]>("/billing/tenants"),
  getAWSAccounts: (tenantId: string) =>
    fetchJson<AWSAccountItem[]>("/billing/accounts", tenantId),
  getDashboardSummary: (tenantId: string) =>
    fetchJson<any>("/billing/dashboard-summary", tenantId),

  // AWS Cost Explorer & KPI Endpoints
  getAWSKpi: (tenantId: string, accountId?: string) =>
    fetchJson<AWSKpiSummary>(
      `/billing/aws/kpi${accountId ? `?account_id=${accountId}` : ""}`,
      tenantId
    ),
  getCostExplorer: (
    tenantId: string,
    groupBy: string = "service",
    days: number = 30,
    accountId?: string,
    serviceFilter?: string
  ) => {
    const params = new URLSearchParams({ group_by: groupBy, days: days.toString() });
    if (accountId && accountId !== "ALL") params.append("account_id", accountId);
    if (serviceFilter && serviceFilter !== "ALL") params.append("service_filter", serviceFilter);
    return fetchJson<CostExplorerResponse>(`/billing/aws/cost-explorer?${params.toString()}`, tenantId);
  },
  getIdleResources: (tenantId: string) =>
    fetchJson<{
      total_monthly_waste: number;
      total_annualized_waste: number;
      idle_resources: IdleResourceItem[];
    }>("/billing/idle-resources", tenantId),
  seedData: (days: number = 30) =>
    fetchJson<any>(`/billing/seed?days=${days}`, "tenant-acme", { method: "POST" }),

  // Real Live AWS Cost Explorer Endpoints
  getAWSLiveStatus: (tenantId: string) =>
    fetchJson<{
      is_connected: boolean;
      account_id?: string;
      verification: any;
      live_records_count: number;
      env_credentials_present: boolean;
    }>("/billing/aws/live-status", tenantId),
  connectAWSCredentials: (
    tenantId: string,
    payload: {
      access_key_id: string;
      secret_access_key: string;
      session_token?: string;
      region?: string;
      role_arn?: string;
      sync_immediately?: boolean;
      days?: number;
    }
  ) =>
    fetchJson<any>("/billing/aws/connect-credentials", tenantId, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  syncLiveAWS: (tenantId: string, days: number = 30) =>
    fetchJson<any>(`/billing/aws/sync-live?days=${days}`, tenantId, { method: "POST" }),
  getAWSOnboardingTemplate: (tenantId: string) =>
    fetchJson<{
      onesight_account_id: string;
      external_id: string;
      role_name: string;
      cloudformation_yaml: string;
      quick_create_url: string;
      cli_command: string;
      terraform_hcl: string;
    }>("/billing/aws/onboarding-template", tenantId),
  onboardSTSRole: (
    tenantId: string,
    payload: {
      role_arn: string;
      external_id: string;
      sync_immediately?: boolean;
      days?: number;
    }
  ) =>
    fetchJson<any>("/billing/aws/onboard-sts-role", tenantId, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // AWS Cost Anomalies & AI RCA
  getAnomalies: (
    tenantId: string,
    params?: { account_id?: string; severity?: string; status?: string }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.account_id && params.account_id !== "ALL")
      searchParams.append("account_id", params.account_id);
    if (params?.severity && params.severity !== "ALL")
      searchParams.append("severity", params.severity);
    if (params?.status && params.status !== "ALL")
      searchParams.append("status", params.status);
    const query = searchParams.toString();
    return fetchJson<AnomalyItem[]>(`/anomalies${query ? `?${query}` : ""}`, tenantId);
  },
  getAnomalyDetails: (id: number, tenantId: string) =>
    fetchJson<AnomalyItem>(`/anomalies/${id}`, tenantId),
  triggerDetection: (tenantId: string) =>
    fetchJson<any>("/anomalies/detect", tenantId, { method: "POST" }),
  simulateSpike: (
    tenantId: string,
    payload: { account_id: string; service_name: string; spike_cost: number; reason?: string }
  ) =>
    fetchJson<any>("/anomalies/simulate-spike", tenantId, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  triggerRCA: (anomalyId: number, tenantId: string) =>
    fetchJson<any>(`/anomalies/${anomalyId}/rca`, tenantId, { method: "POST" }),
  updateAnomalyStatus: (anomalyId: number, status: string, tenantId: string) =>
    fetchJson<any>(`/anomalies/${anomalyId}/status`, tenantId, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Alert Rules & Dispatcher
  getAlertRules: (tenantId: string) => fetchJson<AlertRuleItem[]>("/alerts/rules", tenantId),
  createAlertRule: (tenantId: string, rule: Partial<AlertRuleItem>) =>
    fetchJson<any>("/alerts/rules", tenantId, {
      method: "POST",
      body: JSON.stringify(rule),
    }),
  deleteAlertRule: (ruleId: number, tenantId: string) =>
    fetchJson<any>(`/alerts/rules/${ruleId}`, tenantId, { method: "DELETE" }),
  getAlertHistory: (tenantId: string) =>
    fetchJson<AlertHistoryItem[]>("/alerts/history", tenantId),
  sendTestAlert: (
    tenantId: string,
    payload: { channel: string; severity: string; title: string; message: string; webhook_url?: string }
  ) =>
    fetchJson<any>("/alerts/test", tenantId, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Agentic AI Endpoints
  chatWithAgent: (tenantId: string, message: string) =>
    fetchJson<{ reply: string; tools: string[]; thoughts: string }>("/agents/chat", tenantId, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  remediateIdle: (tenantId: string, resourceId: string, action: string = "SNAPSHOT_AND_DELETE") =>
    fetchJson<any>("/agents/remediate-idle", tenantId, {
      method: "POST",
      body: JSON.stringify({ resource_id: resourceId, action }),
    }),
};
