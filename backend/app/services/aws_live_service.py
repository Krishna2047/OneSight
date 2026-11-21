import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from sqlalchemy.orm import Session
from app.models.tenant import Tenant, AWSAccount
from app.models.billing import BillingRecord, CloudProvider, IdleResource
from app.models.anomaly import AnomalyEvent
from app.core.config import settings

logger = logging.getLogger("onesight.aws_live")

class AWSLiveCostExplorerService:
    """
    Connects to real AWS Cost Explorer API (boto3 'ce' client)
    to query real-time cost, usage, dimensions, forecasts, and anomalies.
    """

    @classmethod
    def get_ce_client(
        cls,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        session_token: Optional[str] = None,
        region: str = "us-east-1",
        role_arn: Optional[str] = None
    ):
        """
        Builds authenticated boto3 Cost Explorer client.
        Cost Explorer endpoint is always in us-east-1.
        """
        # 1. Check if specific keys provided
        ak = access_key_id or os.environ.get("AWS_ACCESS_KEY_ID") or settings.AWS_ACCESS_KEY_ID
        sk = secret_access_key or os.environ.get("AWS_SECRET_ACCESS_KEY") or settings.AWS_SECRET_ACCESS_KEY
        st = session_token or os.environ.get("AWS_SESSION_TOKEN")

        session_kwargs = {}
        if ak and sk:
            session_kwargs["aws_access_key_id"] = ak
            session_kwargs["aws_secret_access_key"] = sk
            if st:
                session_kwargs["aws_session_token"] = st

        boto_session = boto3.Session(**session_kwargs)

        # 2. Check if Cross-Account Role ARN needs to be assumed
        if role_arn:
            sts_client = boto_session.client("sts", region_name="us-east-1")
            assumed = sts_client.assume_role(
                RoleArn=role_arn,
                RoleSessionName="OneSightFinOpsLiveSession",
                DurationSeconds=3600
            )
            credentials = assumed["Credentials"]
            return boto3.client(
                "ce",
                region_name="us-east-1",
                aws_access_key_id=credentials["AccessKeyId"],
                aws_secret_access_key=credentials["SecretAccessKey"],
                aws_session_token=credentials["SessionToken"]
            )

        # 3. Direct Cost Explorer client
        return boto_session.client("ce", region_name="us-east-1")

    @classmethod
    def verify_credentials(
        cls,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        session_token: Optional[str] = None,
        region: str = "us-east-1",
        role_arn: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Tests live connectivity to AWS Cost Explorer API by requesting
        dimension values for SERVICE over the last 7 days.
        """
        try:
            client = cls.get_ce_client(
                access_key_id=access_key_id,
                secret_access_key=secret_access_key,
                session_token=session_token,
                region=region,
                role_arn=role_arn
            )

            end_dt = datetime.now(timezone.utc)
            start_dt = end_dt - timedelta(days=7)
            start_str = start_dt.strftime("%Y-%m-%d")
            end_str = end_dt.strftime("%Y-%m-%d")

            # Lightweight live test call
            resp = client.get_dimension_values(
                TimePeriod={"Start": start_str, "End": end_str},
                Dimension="SERVICE"
            )

            services = [d.get("Value") for d in resp.get("DimensionValues", [])]

            # Also attempt to get caller identity
            account_id = "UNKNOWN"
            try:
                boto_session = boto3.Session(
                    aws_access_key_id=access_key_id or os.environ.get("AWS_ACCESS_KEY_ID") or settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=secret_access_key or os.environ.get("AWS_SECRET_ACCESS_KEY") or settings.AWS_SECRET_ACCESS_KEY
                )
                sts = boto_session.client("sts")
                identity = sts.get_caller_identity()
                account_id = identity.get("Account", "UNKNOWN")
            except Exception:
                pass

            return {
                "success": True,
                "account_id": account_id,
                "message": f"Successfully authenticated with AWS Cost Explorer API. Found {len(services)} active services.",
                "services_count": len(services),
                "sample_services": services[:8]
            }

        except NoCredentialsError:
            return {
                "success": False,
                "error_code": "NO_CREDENTIALS",
                "message": "No AWS credentials found. Please provide an AWS Access Key ID & Secret Access Key, or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment."
            }
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "UNKNOWN")
            msg = e.response.get("Error", {}).get("Message", str(e))
            if code == "AccessDeniedException":
                return {
                    "success": False,
                    "error_code": code,
                    "message": f"AWS IAM Access Denied. Ensure your IAM user/role has permissions: 'ce:GetCostAndUsage', 'ce:GetCostForecast', 'ce:GetDimensionValues', 'ce:GetAnomalies'. Detail: {msg}"
                }
            elif code == "DataUnavailableException":
                return {
                    "success": False,
                    "error_code": code,
                    "message": f"AWS Cost Explorer is currently enabling for this account. AWS takes up to 24 hours to generate the first dataset: {msg}"
                }
            return {
                "success": False,
                "error_code": code,
                "message": f"AWS API Error ({code}): {msg}"
            }
        except Exception as e:
            return {
                "success": False,
                "error_code": "EXCEPTION",
                "message": f"Connection error: {str(e)}"
            }

    @classmethod
    def fetch_live_cost_and_usage(
        cls,
        days: int = 30,
        group_by_dimension: str = "SERVICE",
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        role_arn: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes real ce.get_cost_and_usage() against AWS.
        """
        client = cls.get_ce_client(
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            role_arn=role_arn
        )

        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - timedelta(days=days)
        start_str = start_dt.strftime("%Y-%m-%d")
        end_str = end_dt.strftime("%Y-%m-%d")

        group_by = []
        if group_by_dimension.startswith("tag:"):
            tag_key = group_by_dimension.split(":", 1)[1]
            group_by.append({"Type": "TAG", "Key": tag_key})
        else:
            dim_key = "SERVICE"
            if group_by_dimension.upper() in ["ACCOUNT", "LINKED_ACCOUNT"]:
                dim_key = "LINKED_ACCOUNT"
            elif group_by_dimension.upper() == "REGION":
                dim_key = "REGION"
            elif group_by_dimension.upper() in ["USAGE_TYPE", "USAGETYPE"]:
                dim_key = "USAGE_TYPE"
            group_by.append({"Type": "DIMENSION", "Key": dim_key})

        response = client.get_cost_and_usage(
            TimePeriod={"Start": start_str, "End": end_str},
            Granularity="DAILY",
            Metrics=["UnblendedCost", "UsageQuantity"],
            GroupBy=group_by
        )

        return response

    @classmethod
    def sync_live_aws_to_database(
        cls,
        db: Session,
        tenant_id: str,
        account_id: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        role_arn: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Pulls real live records from AWS Cost Explorer API and stores them in OneSight database.
        Replaces mock records for this tenant with real AWS records.
        """
        verify = cls.verify_credentials(access_key_id, secret_access_key, role_arn=role_arn)
        if not verify["success"]:
            return verify

        real_account_id = verify.get("account_id") or account_id or "112233445566"

        client = cls.get_ce_client(access_key_id, secret_access_key, role_arn=role_arn)

        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - timedelta(days=days)
        start_str = start_dt.strftime("%Y-%m-%d")
        end_str = end_dt.strftime("%Y-%m-%d")

        logger.info(f"Querying live AWS Cost Explorer for period {start_str} to {end_str}...")

        # 1. Fetch live daily spend by SERVICE and LINKED_ACCOUNT
        ce_response = client.get_cost_and_usage(
            TimePeriod={"Start": start_str, "End": end_str},
            Granularity="DAILY",
            Metrics=["UnblendedCost", "UsageQuantity"],
            GroupBy=[
                {"Type": "DIMENSION", "Key": "SERVICE"},
                {"Type": "DIMENSION", "Key": "LINKED_ACCOUNT"}
            ]
        )

        # 2. Clear old mock billing records for this tenant to reflect real AWS invoice
        db.query(BillingRecord).filter(
            BillingRecord.tenant_id == tenant_id,
            BillingRecord.provider == CloudProvider.AWS
        ).delete()

        synced_count = 0
        total_live_cost = 0.0

        for time_block in ce_response.get("ResultsByTime", []):
            date_str = time_block["TimePeriod"]["Start"]
            record_dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)

            for group in time_block.get("Groups", []):
                keys = group.get("Keys", ["Unknown", real_account_id])
                svc_name = keys[0] if len(keys) > 0 else "Unknown"
                linked_acc = keys[1] if len(keys) > 1 else real_account_id

                cost_val = float(group["Metrics"]["UnblendedCost"]["Amount"])
                usage_qty = float(group["Metrics"]["UsageQuantity"]["Amount"])

                if cost_val > 0.0001:
                    total_live_cost += cost_val
                    rec = BillingRecord(
                        tenant_id=tenant_id,
                        account_id=linked_acc,
                        account_name=f"AWS Linked ({linked_acc})",
                        provider=CloudProvider.AWS,
                        service_name=svc_name,
                        usage_type=f"{svc_name}-Usage",
                        cost=cost_val,
                        currency="USD",
                        region="us-east-1",
                        usage_quantity=usage_qty,
                        unit="Units",
                        billing_period_start=record_dt,
                        billing_period_end=record_dt + timedelta(days=1),
                        recorded_at=record_dt,
                        tags={"Source": "Live-AWS-CostExplorer", "SyncDate": datetime.now(timezone.utc).isoformat()}
                    )
                    db.add(rec)
                    synced_count += 1

        # 3. Ensure AWSAccount record reflects the verified live account
        acc = db.query(AWSAccount).filter(
            AWSAccount.tenant_id == tenant_id,
            AWSAccount.account_id == real_account_id
        ).first()

        if not acc:
            acc = AWSAccount(
                tenant_id=tenant_id,
                account_id=real_account_id,
                account_name="AWS Live Primary Account",
                account_type="MANAGEMENT",
                default_region="us-east-1",
                status="CONNECTED",
                role_arn=role_arn
            )
            db.add(acc)
        else:
            acc.status = "CONNECTED"
            if role_arn:
                acc.role_arn = role_arn

        db.commit()

        logger.info(f"Successfully synced {synced_count} real AWS billing records. Total Spend: ${total_live_cost:,.2f}")

        return {
            "success": True,
            "tenant_id": tenant_id,
            "account_id": real_account_id,
            "records_synced": synced_count,
            "total_spend": round(total_live_cost, 2),
            "period": f"{start_str} to {end_str}",
            "message": f"Successfully pulled and synced {synced_count} real AWS Cost Explorer records (${total_live_cost:,.2f} USD)."
        }
