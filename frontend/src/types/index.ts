export interface TenantItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  aws_accounts: AWSAccountItem[];
}

export interface AWSAccountItem {
  account_id: string;
  account_name: string;
  account_type: "MANAGEMENT" | "MEMBER";
  region: string;
  status: string;
}

export interface DashboardSummaryResponse {
  kpi: {
    organisational_expenses: number;
    organisational_expenses_k: string;
    forecast_expense: number;
    forecast_expense_k: string;
    no_of_resources: number;
    no_of_regions: number;
    change_pct: number;
    change_type: string;
  };
  organisation_expenses_chart: {
    budget_limit: number;
    budget_limit_k: string;
    months: Array<{
      month: string;
      amount: number;
      amount_k: string;
      is_forecast: boolean;
    }>;
  };
  potential_savings: {
    month_forecast_k: string;
    savings_delivered: number;
    savings_delivered_k: string;
    remaining_savings: number;
    remaining_savings_k: string;
    cost_count: number;
    security_count: number;
    critical_count: number;
  };
  top_resource_expenses: Array<{
    name: string;
    cost: number;
    unit: string;
  }>;
  policy_violations: Array<{
    id: number;
    name: string;
    last_check: string;
    type: string;
    status_text: string;
    severity: string;
  }>;
  pools_requiring_attention: Array<{
    id: number;
    name: string;
    provider: string;
    limit: number;
    expenses_this_month: number;
    expenses_change_pct: number;
    forecast_this_month: number;
    forecast_change_pct: number;
    owner: string;
    status: string;
  }>;
}

export interface AWSKpiSummary {
  total_spend: number;
  mtd_spend: number;
  forecast_month_end: number;
  prior_month_spend: number;
  variance_amount: number;
  variance_percent: number;
  daily_burn_rate: number;
}

export interface CostExplorerTimelinePoint {
  date: string;
  total: number;
  [key: string]: any;
}

export interface CostExplorerBreakdownItem {
  dimension_name: string;
  total_spend: number;
  current_period_spend: number;
  prior_period_spend: number;
  variance_amount: number;
  variance_percent: number;
  percentage_of_total: number;
}

export interface CostExplorerResponse {
  dimension: string;
  dimensions_list: string[];
  timeline: CostExplorerTimelinePoint[];
  breakdown: CostExplorerBreakdownItem[];
  total_period_spend: number;
}

export interface IdleResourceItem {
  id: number;
  tenant_id: string;
  provider: "AWS";
  account_id: string;
  account_name: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  region: string;
  monthly_waste_cost: number;
  status: "ACTIVE_IDLE" | "REMEDIATED" | "IGNORED";
  details?: Record<string, any>;
}

export interface AnomalyItem {
  id: number;
  tenant_id: string;
  provider: "AWS";
  account_id: string;
  account_name: string;
  service_name: string;
  usage_type?: string;
  region: string;
  anomaly_date: string;
  current_cost: number;
  baseline_cost: number;
  cost_delta: number;
  deviation_percent: number;
  z_score: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "DETECTED" | "INVESTIGATING" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  root_cause_summary?: string;
  suspect_resources?: string[];
  remediation_recommendations?: string[];
  ai_confidence?: number;
  rca_generated_at?: string;
}

export interface AlertRuleItem {
  id: number;
  tenant_id: string;
  name: string;
  description?: string;
  provider: string;
  account_filter?: string;
  metric_type: string;
  threshold_value: number;
  service_filter?: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "WARNING" | "HIGH" | "CRITICAL";
  channels: string[];
  webhook_url?: string;
  is_enabled: boolean;
  created_at?: string;
}

export interface AlertHistoryItem {
  id: number;
  tenant_id: string;
  rule_name: string;
  channel: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  sent_at: string;
  response_payload?: any;
}

export interface AgentChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  tools?: string[];
  thoughts?: string;
}
