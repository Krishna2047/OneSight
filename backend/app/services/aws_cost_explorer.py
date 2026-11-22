import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.billing import BillingRecord, CloudProvider

logger = logging.getLogger("onesight.aws_cost_explorer")

import logging
import calendar
from datetime import datetime, timedelta, timezone, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.billing import BillingRecord, CloudProvider

logger = logging.getLogger("onesight.aws_cost_explorer")

class AWSCostExplorerService:
    """
    AWS Cost Explorer query and aggregation engine.
    Supports Group By: Service, Linked Account, Region, Usage Type, and Cost Allocation Tags.
    100% computed from real database records.
    """

    @classmethod
    def get_kpi_summary(
        cls,
        db: Session,
        tenant_id: str = "tenant-acme",
        account_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates AWS Cost Explorer KPI Summary 100% from real records:
        - Month-to-date (MTD) spend: actual accrued spend in current calendar month
        - Prior period spend: actual recorded spend in prior month
        - Month-end forecast: actual MTD + (7-day daily burn rate * remaining days in month)
        - Daily burn rate: rolling 7-day average
        """
        query = db.query(BillingRecord).filter(
            BillingRecord.tenant_id == tenant_id,
            BillingRecord.provider == CloudProvider.AWS
        )
        if account_id and account_id != "ALL":
            query = query.filter(BillingRecord.account_id == account_id)

        all_dates_query = db.query(BillingRecord.record_date).filter(
            BillingRecord.tenant_id == tenant_id,
            BillingRecord.provider == CloudProvider.AWS
        )
        if account_id and account_id != "ALL":
            all_dates_query = all_dates_query.filter(BillingRecord.account_id == account_id)
        all_dates_list = sorted([d[0] for d in all_dates_query.distinct().all()])

        if not all_dates_list:
            return {
                "total_spend": 0.0,
                "mtd_spend": 0.0,
                "forecast_month_end": 0.0,
                "prior_month_spend": 0.0,
                "variance_amount": 0.0,
                "variance_percent": 0.0,
                "daily_burn_rate": 0.0,
            }

        latest_date_str = all_dates_list[-1]
        try:
            latest_date = datetime.strptime(latest_date_str, "%Y-%m-%d").date()
        except ValueError:
            latest_date = datetime.now(timezone.utc).date()

        current_month_prefix = latest_date.strftime("%Y-%m")
        _, total_days_in_month = calendar.monthrange(latest_date.year, latest_date.month)
        days_elapsed = latest_date.day
        days_remaining = max(total_days_in_month - days_elapsed, 0)

        # 1. Total spend across all available days in DB
        total_spend = query.with_entities(func.sum(BillingRecord.cost)).scalar() or 0.0

        # 2. Real Month-to-Date (MTD) spend (e.g. 2026-11-01 to 2026-11-21)
        mtd_query = query.filter(BillingRecord.record_date.like(f"{current_month_prefix}%"))
        mtd_spend = mtd_query.with_entities(func.sum(BillingRecord.cost)).scalar() or 0.0

        # 3. Real 7-day rolling daily burn rate
        recent_7_dates = all_dates_list[-7:]
        recent_sum_query = query.filter(BillingRecord.record_date.in_(recent_7_dates))
        recent_total = recent_sum_query.with_entities(func.sum(BillingRecord.cost)).scalar() or 0.0
        daily_burn_rate = round(recent_total / len(recent_7_dates), 2) if recent_7_dates else (round(mtd_spend / max(days_elapsed, 1), 2) if days_elapsed > 0 else 0.0)

        # 4. Standard FinOps Month-End Forecast = Actual MTD + (Burn Rate * Remaining Days)
        forecast_month_end = round(mtd_spend + (daily_burn_rate * days_remaining), 2)

        # 5. Prior Month Recorded Spend (e.g. 2026-10)
        first_of_month = latest_date.replace(day=1)
        prior_month_date = first_of_month - timedelta(days=1)
        prior_month_prefix = prior_month_date.strftime("%Y-%m")
        prior_month_query = query.filter(BillingRecord.record_date.like(f"{prior_month_prefix}%"))
        prior_month_spend = prior_month_query.with_entities(func.sum(BillingRecord.cost)).scalar() or 0.0

        # Variance vs prior month (or vs baseline)
        if prior_month_spend > 0:
            variance_amount = round(forecast_month_end - prior_month_spend, 2)
            variance_pct = round(((forecast_month_end - prior_month_spend) / prior_month_spend) * 100.0, 1)
        else:
            variance_amount = 0.0
            variance_pct = 0.0

        return {
            "total_spend": round(total_spend, 2),
            "mtd_spend": round(mtd_spend, 2),
            "forecast_month_end": forecast_month_end,
            "prior_month_spend": round(prior_month_spend, 2),
            "variance_amount": variance_amount,
            "variance_percent": variance_pct,
            "daily_burn_rate": daily_burn_rate,
        }

    @classmethod
    def query_cost_and_usage(
        cls,
        db: Session,
        tenant_id: str = "tenant-acme",
        group_by: str = "service", # service, account, region, usage_type, tag:Environment, tag:Team
        days: int = 30, # 0 = Month-to-Date (MTD), positive int = last N days
        account_id: Optional[str] = None,
        service_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a dimension-based AWS Cost Explorer aggregation query.
        Returns time series matrix with grouped segments and a breakdown table.
        100% computed from real records matching the selected time range.
        """
        base_query = db.query(BillingRecord).filter(
            BillingRecord.tenant_id == tenant_id,
            BillingRecord.provider == CloudProvider.AWS
        )

        if account_id and account_id != "ALL":
            base_query = base_query.filter(BillingRecord.account_id == account_id)
        if service_filter and service_filter != "ALL":
            base_query = base_query.filter(BillingRecord.service_name == service_filter)

        # Determine grouping column
        records = base_query.all()
        if not records:
            return {
                "timeline": [],
                "breakdown": [],
                "dimension": group_by,
                "total": 0.0,
                "total_period_spend": 0.0,
                "period_label": "No Data",
                "current_half_label": "N/A",
                "prior_half_label": "N/A",
                "days_count": 0,
                "dimensions_list": []
            }

        def get_dimension_value(record: BillingRecord) -> str:
            if group_by == "service":
                return record.service_name
            elif group_by == "account":
                return f"{record.account_name} ({record.account_id})"
            elif group_by == "region":
                return record.region
            elif group_by == "usage_type":
                return record.usage_type or record.service_name
            elif group_by.startswith("tag:"):
                tag_key = group_by.split(":", 1)[1]
                if record.tags and isinstance(record.tags, dict):
                    return record.tags.get(tag_key, "Untagged")
                return "Untagged"
            return record.service_name

        # 1. Determine Selected Date Range
        all_dates = sorted(list(set(r.record_date for r in records)))
        latest_date_str = all_dates[-1] if all_dates else ""
        current_month_prefix = latest_date_str[:7]

        # days: 0 means Month-to-Date (MTD)
        if days == 0:
            dates = [d for d in all_dates if d.startswith(current_month_prefix)]
            period_label = f"MTD ({current_month_prefix}-01 to {latest_date_str})"
        else:
            dates = all_dates[-days:] if len(all_dates) >= days else all_dates
            period_label = f"Last {len(dates)} Days ({dates[0]} to {dates[-1]})"

        dates_set = set(dates)
        # CRUCIAL: Filter records strictly to the selected dates!
        period_records = [r for r in records if r.record_date in dates_set]

        # Identify dimension totals within the selected date range
        dim_totals: Dict[str, float] = {}
        for r in period_records:
            dim_val = get_dimension_value(r)
            dim_totals[dim_val] = dim_totals.get(dim_val, 0.0) + r.cost

        sorted_dims = sorted(dim_totals.items(), key=lambda x: x[1], reverse=True)
        top_dims = [dim for dim, _ in sorted_dims[:6]]
        has_other = len(sorted_dims) > 6

        timeline_map: Dict[str, Dict[str, Any]] = {
            d: {"date": d, "total": 0.0, **{dim: 0.0 for dim in top_dims}} for d in dates
        }
        if has_other:
            for d in dates:
                timeline_map[d]["Other"] = 0.0

        for r in period_records:
            if r.record_date in timeline_map:
                dim_val = get_dimension_value(r)
                target_key = dim_val if dim_val in top_dims else "Other"
                timeline_map[r.record_date][target_key] = round(
                    timeline_map[r.record_date].get(target_key, 0.0) + r.cost, 2
                )
                timeline_map[r.record_date]["total"] = round(
                    timeline_map[r.record_date]["total"] + r.cost, 2
                )

        timeline = list(timeline_map.values())
        total_period_spend = sum(dim_totals.values())

        # 2. Build Period-over-Period Variance Breakdown Table
        half_point = len(dates) // 2
        prior_dates = dates[:half_point]
        current_dates = dates[half_point:]
        prior_dates_set = set(prior_dates)
        current_dates_set = set(current_dates)

        prior_half_label = f"{prior_dates[0]} to {prior_dates[-1]}" if prior_dates else "N/A"
        current_half_label = f"{current_dates[0]} to {current_dates[-1]}" if current_dates else "N/A"

        current_half_map: Dict[str, float] = {}
        prior_half_map: Dict[str, float] = {}

        for r in period_records:
            dim_val = get_dimension_value(r)
            if r.record_date in current_dates_set:
                current_half_map[dim_val] = current_half_map.get(dim_val, 0.0) + r.cost
            elif r.record_date in prior_dates_set:
                prior_half_map[dim_val] = prior_half_map.get(dim_val, 0.0) + r.cost

        num_days = max(len(dates), 1)
        breakdown: List[Dict[str, Any]] = []
        for dim_val, total_cost in sorted_dims:
            curr = current_half_map.get(dim_val, 0.0)
            prior = prior_half_map.get(dim_val, 0.0)
            var_amt = round(curr - prior, 2)
            var_pct = round(((curr - prior) / prior * 100.0), 1) if prior > 0 else 0.0

            breakdown.append({
                "dimension_name": dim_val,
                "total_spend": round(total_cost, 2),
                "daily_average": round(total_cost / num_days, 2),
                "current_period_spend": round(curr, 2),
                "prior_period_spend": round(prior, 2),
                "variance_amount": var_amt,
                "variance_percent": var_pct,
                "percentage_of_total": round((total_cost / total_period_spend * 100.0), 1) if total_period_spend > 0 else 0.0
            })

        return {
            "dimension": group_by,
            "dimensions_list": top_dims + (["Other"] if has_other else []),
            "timeline": timeline,
            "breakdown": breakdown,
            "total_period_spend": round(total_period_spend, 2),
            "period_label": period_label,
            "current_half_label": current_half_label,
            "prior_half_label": prior_half_label,
            "days_count": len(dates)
        }
