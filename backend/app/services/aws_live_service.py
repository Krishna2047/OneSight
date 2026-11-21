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
        role_arn: Optional[str] = None,
        external_id: Optional[str] = None
    ):
        """
        Builds authenticated boto3 Cost Explorer client.
        Cost Explorer endpoint is always in us-east-1.
        Supports direct IAM keys OR Cross-Account STS AssumeRole with ExternalId.
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
            assume_kwargs = {
                "RoleArn": role_arn,
                "RoleSessionName": "OneSightFinOpsLiveSession",
                "DurationSeconds": 3600
            }
            if external_id:
                assume_kwargs["ExternalId"] = external_id

            assumed = sts_client.assume_role(**assume_kwargs)
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
        role_arn: Optional[str] = None,
        external_id: Optional[str] = None
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
                role_arn=role_arn,
                external_id=external_id
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
        session_token: Optional[str] = None,
        role_arn: Optional[str] = None,
        external_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Pulls real live records from AWS Cost Explorer API and stores them in OneSight database.
        Credentials are encrypted at rest using AES-256 Fernet.
        """
        # If credentials were not passed in, attempt to load decrypted credentials from database
        if not access_key_id and not role_arn and db:
            account_query = db.query(AWSAccount).filter(AWSAccount.tenant_id == tenant_id)
            if account_id and account_id != "ALL":
                account_query = account_query.filter(AWSAccount.account_id == account_id)
            stored_acc = account_query.first()
            if stored_acc:
                creds = stored_acc.get_decrypted_credentials()
                access_key_id = creds.get("access_key_id")
                secret_access_key = creds.get("secret_access_key")
                session_token = creds.get("session_token")
                external_id = creds.get("external_id")
                if stored_acc.role_arn:
                    role_arn = stored_acc.role_arn

        verify = cls.verify_credentials(
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            session_token=session_token,
            role_arn=role_arn,
            external_id=external_id
        )
        if not verify["success"]:
            return verify

        real_account_id = verify.get("account_id") or account_id
        if not real_account_id or real_account_id == "UNKNOWN":
            return {
                "success": False,
                "error_code": "UNKNOWN_ACCOUNT_ID",
                "message": "Unable to determine AWS Account ID from credentials. Verify IAM permissions for sts:GetCallerIdentity."
            }

        client = cls.get_ce_client(
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            session_token=session_token,
            role_arn=role_arn,
            external_id=external_id
        )

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

        # 2. Clear old billing records for this tenant to reflect real AWS invoice
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
                        usage_amount=usage_qty,
                        usage_unit="Units",
                        record_date=date_str,
                        timestamp=record_dt,
                        tags={"Source": "Live-AWS-CostExplorer", "SyncDate": datetime.now(timezone.utc).isoformat()}
                    )
                    db.add(rec)
                    synced_count += 1

        # 3. Ensure AWSAccount record reflects the verified live account and encrypts credentials
        acc = db.query(AWSAccount).filter(
            AWSAccount.tenant_id == tenant_id,
            AWSAccount.account_id == real_account_id
        ).first()

        if not acc:
            acc = AWSAccount(
                tenant_id=tenant_id,
                account_id=real_account_id,
                account_name=f"AWS Primary Account ({real_account_id})",
                account_type="MANAGEMENT",
                default_region="us-east-1",
                status="CONNECTED",
                role_arn=role_arn,
                auth_method="IAM_KEYS" if access_key_id else "STS_ROLE",
                last_synced_at=datetime.now(timezone.utc)
            )
            acc.set_credentials(
                access_key_id=access_key_id,
                secret_access_key=secret_access_key,
                session_token=session_token,
                external_id=external_id
            )
            db.add(acc)
        else:
            acc.status = "CONNECTED"
            acc.last_synced_at = datetime.now(timezone.utc)
            if role_arn:
                acc.role_arn = role_arn
            if access_key_id:
                acc.set_credentials(
                    access_key_id=access_key_id,
                    secret_access_key=secret_access_key,
                    session_token=session_token,
                    external_id=external_id
                )

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

    @classmethod
    def generate_cft_template(cls, tenant_id: str, tenant_name: str = "Enterprise") -> Dict[str, Any]:
        """
        Generates 1-Click AWS CloudFormation Onboarding bundle:
        - Unique External ID (prevents confused deputy problem)
        - Master OneSight SaaS AWS Account ID
        - Ready-to-deploy CloudFormation YAML
        - 1-Click AWS Console Quick-Create Deep Link
        - Terraform module & AWS CLI 1-liner
        """
        onesight_account_id = getattr(settings, "ONESIGHT_AWS_ACCOUNT_ID", "123456789012")
        safe_tenant_clean = tenant_id.replace("tenant-", "").replace("_", "-")
        external_id = f"onesight-{safe_tenant_clean}-finops-auth"

        cft_yaml = f"""AWSTemplateFormatVersion: '2010-09-09'
Description: 'OneSight FinOps Cross-Account STS AssumeRole with Cost Explorer and AWS Organizations Read-Only Access'

Parameters:
  OneSightAccountId:
    Type: String
    Default: '{onesight_account_id}'
    Description: 'The AWS Account ID of the OneSight SaaS platform.'
  ExternalId:
    Type: String
    Default: '{external_id}'
    Description: 'Unique tenant External ID preventing the Confused Deputy problem.'

Resources:
  OneSightCostOptimizerRole:
    Type: 'AWS::IAM::Role'
    Properties:
      RoleName: 'OneSightCostOptimizerRole'
      Description: 'Allows OneSight Agentic AI & Cost Explorer to read AWS billing & organization topology'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${{OneSightAccountId}}:root'
            Action: 'sts:AssumeRole'
            Condition:
              StringEquals:
                'sts:ExternalId': !Ref ExternalId
      Policies:
        - PolicyName: 'OneSightCostExplorerReadOnly'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - 'ce:GetCostAndUsage'
                  - 'ce:GetCostForecast'
                  - 'ce:GetDimensionValues'
                  - 'ce:GetAnomalies'
                  - 'organizations:ListAccounts'
                  - 'organizations:DescribeOrganization'
                  - 'sts:GetCallerIdentity'
                Resource: '*'

Outputs:
  RoleArn:
    Description: 'Copy this Role ARN back to OneSight to finish 1-click onboarding'
    Value: !GetAtt OneSightCostOptimizerRole.Arn
  ExternalId:
    Description: 'Configured External ID'
    Value: !Ref ExternalId
"""

        quick_create_url = (
            f"https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/quickcreate"
            f"?stackName=OneSight-CostOptimizer-Integration"
            f"&param_OneSightAccountId={onesight_account_id}"
            f"&param_ExternalId={external_id}"
        )

        cli_command = (
            f"aws cloudformation create-stack "
            f"--stack-name OneSight-FinOps-Integration "
            f"--template-body file://onesight-cft.yaml "
            f"--parameters ParameterKey=OneSightAccountId,ParameterValue={onesight_account_id} "
            f"ParameterKey=ExternalId,ParameterValue={external_id} "
            f"--capabilities CAPABILITY_NAMED_IAM"
        )

        terraform_hcl = f"""# OneSight FinOps Cross-Account STS AssumeRole
resource "aws_iam_role" "onesight_role" {{
  name = "OneSightCostOptimizerRole"

  assume_role_policy = jsonencode({{
    Version = "2012-10-17"
    Statement = [
      {{
        Effect = "Allow"
        Principal = {{
          AWS = "arn:aws:iam::{onesight_account_id}:root"
        }}
        Action = "sts:AssumeRole"
        Condition = {{
          StringEquals = {{
            "sts:ExternalId" = "{external_id}"
          }}
        }}
      }}
    ]
  }})
}}

resource "aws_iam_role_policy" "onesight_policy" {{
  name = "OneSightCostExplorerReadOnly"
  role = aws_iam_role.onesight_role.id

  policy = jsonencode({{
    Version = "2012-10-17"
    Statement = [
      {{
        Effect = "Allow"
        Action = [
          "ce:GetCostAndUsage",
          "ce:GetCostForecast",
          "ce:GetDimensionValues",
          "ce:GetAnomalies",
          "organizations:ListAccounts",
          "organizations:DescribeOrganization",
          "sts:GetCallerIdentity"
        ]
        Resource = "*"
      }}
    ]
  }})
}}

output "onesight_role_arn" {{
  value = aws_iam_role.onesight_role.arn
}}
"""

        return {
            "onesight_account_id": onesight_account_id,
            "external_id": external_id,
            "role_name": "OneSightCostOptimizerRole",
            "cloudformation_yaml": cft_yaml,
            "quick_create_url": quick_create_url,
            "cli_command": cli_command,
            "terraform_hcl": terraform_hcl,
        }

    @classmethod
    def verify_and_onboard_sts_role(
        cls,
        db: Session,
        tenant_id: str,
        role_arn: str,
        external_id: str,
        sync_days: int = 30
    ) -> Dict[str, Any]:
        """
        1-Click Onboards customer AWS Account using STS AssumeRole with ExternalId:
        1. Calls sts:AssumeRole to verify the trust relationship and external ID.
        2. Calls sts:GetCallerIdentity to retrieve customer AWS Account ID.
        3. Tries AWS Organizations auto-discovery (organizations:ListAccounts).
        4. Syncs real AWS Cost Explorer records into the database.
        5. Registers all accounts in database.
        """
        ak = os.environ.get("AWS_ACCESS_KEY_ID") or settings.AWS_ACCESS_KEY_ID
        sk = os.environ.get("AWS_SECRET_ACCESS_KEY") or settings.AWS_SECRET_ACCESS_KEY

        session_kwargs = {}
        if ak and sk:
            session_kwargs["aws_access_key_id"] = ak
            session_kwargs["aws_secret_access_key"] = sk

        boto_session = boto3.Session(**session_kwargs)
        sts_client = boto_session.client("sts", region_name="us-east-1")

        try:
            assumed = sts_client.assume_role(
                RoleArn=role_arn,
                RoleSessionName="OneSightOnboardingSession",
                ExternalId=external_id,
                DurationSeconds=3600
            )
            creds = assumed["Credentials"]
        except Exception as e:
            logger.error(f"Failed to assume role {role_arn} with external_id {external_id}: {e}")
            return {
                "success": False,
                "error_code": "ASSUME_ROLE_FAILED",
                "message": f"Could not assume STS Role ({role_arn}). Verify the CloudFormation stack deployed with External ID '{external_id}'. AWS Error: {str(e)}"
            }

        # 2. Get customer account identity
        assumed_session = boto3.Session(
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
            region_name="us-east-1"
        )
        assumed_sts = assumed_session.client("sts")
        caller = assumed_sts.get_caller_identity()
        customer_account_id = caller.get("Account", "UNKNOWN")

        # 3. AWS Organizations fleet auto-discovery
        discovered_accounts = []
        is_org_management = False
        try:
            org_client = assumed_session.client("organizations")
            paginator = org_client.get_paginator("list_accounts")
            for page in paginator.paginate():
                for acc_item in page.get("Accounts", []):
                    acc_id = acc_item.get("Id")
                    acc_name = acc_item.get("Name", f"AWS Account ({acc_id})")
                    acc_status = acc_item.get("Status", "ACTIVE")

                    # Register in DB
                    existing_acc = db.query(AWSAccount).filter(
                        AWSAccount.tenant_id == tenant_id,
                        AWSAccount.account_id == acc_id
                    ).first()

                    if not existing_acc:
                        new_acc = AWSAccount(
                            tenant_id=tenant_id,
                            account_id=acc_id,
                            account_name=acc_name,
                            account_type="MANAGEMENT" if acc_id == customer_account_id else "MEMBER",
                            default_region="us-east-1",
                            status="CONNECTED" if acc_status == "ACTIVE" else "SUSPENDED",
                            role_arn=role_arn,
                            auth_method="STS_ROLE",
                            last_synced_at=datetime.now(timezone.utc)
                        )
                        new_acc.set_credentials(external_id=external_id)
                        db.add(new_acc)
                    else:
                        existing_acc.status = "CONNECTED"
                        existing_acc.role_arn = role_arn
                        existing_acc.auth_method = "STS_ROLE"
                        existing_acc.last_synced_at = datetime.now(timezone.utc)
                        existing_acc.set_credentials(external_id=external_id)

                    discovered_accounts.append({
                        "account_id": acc_id,
                        "account_name": acc_name,
                        "status": acc_status,
                        "is_management": (acc_id == customer_account_id)
                    })
            db.commit()
            is_org_management = len(discovered_accounts) > 1
        except Exception as org_err:
            logger.info(f"AWS Organizations discovery skipped or standalone account: {org_err}")
            # Ensure standalone primary account is registered
            acc = db.query(AWSAccount).filter(
                AWSAccount.tenant_id == tenant_id,
                AWSAccount.account_id == customer_account_id
            ).first()
            if not acc:
                acc = AWSAccount(
                    tenant_id=tenant_id,
                    account_id=customer_account_id,
                    account_name=f"AWS Account ({customer_account_id})",
                    account_type="MANAGEMENT",
                    default_region="us-east-1",
                    status="CONNECTED",
                    role_arn=role_arn,
                    auth_method="STS_ROLE",
                    last_synced_at=datetime.now(timezone.utc)
                )
                acc.set_credentials(external_id=external_id)
                db.add(acc)
            else:
                acc.status = "CONNECTED"
                acc.role_arn = role_arn
                acc.auth_method = "STS_ROLE"
                acc.last_synced_at = datetime.now(timezone.utc)
                acc.set_credentials(external_id=external_id)
            db.commit()
            discovered_accounts.append({
                "account_id": customer_account_id,
                "account_name": f"AWS Primary Account ({customer_account_id})",
                "status": "ACTIVE",
                "is_management": True
            })

        # 4. Sync live Cost Explorer data
        sync_result = {}
        try:
            sync_result = cls.sync_live_aws_to_database(
                db=db,
                tenant_id=tenant_id,
                account_id=customer_account_id,
                role_arn=role_arn,
                external_id=external_id,
                days=sync_days
            )
        except Exception as sync_err:
            logger.warning(f"Initial sync warning: {sync_err}")
            sync_result = {"warning": str(sync_err), "records_synced": 0}

        return {
            "success": True,
            "account_id": customer_account_id,
            "role_arn": role_arn,
            "external_id": external_id,
            "is_org_management": is_org_management,
            "discovered_accounts": discovered_accounts,
            "discovered_accounts_count": len(discovered_accounts),
            "sync_result": sync_result,
            "message": f"Successfully onboarded AWS Account {customer_account_id} via STS Cross-Account Role! Discovered {len(discovered_accounts)} member account(s)."
        }
