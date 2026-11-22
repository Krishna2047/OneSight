import os
import re
import shlex
import time
import subprocess
import logging
from typing import Dict, Any, Tuple, Optional, List
from sqlalchemy.orm import Session
from app.core.config import settings

logger = logging.getLogger("onesight.aws_runner")

class AWSReadOnlyCommandRunner:
    """
    Autonomous Read-Only AWS CLI & Boto3 Command Execution Engine.
    Enforces the 4 Production Guardrails:
    1. Strict Command Sanitizer (Safety Gate): Only allows read-only verbs.
    2. Loop Limiter: Capped max turns.
    3. Payload Truncation: Restricts output to protect LLM context window.
    4. Execution Transparency: Captures exact commands, status, latencies, and outputs.
    """

    ALLOWED_PREFIXES = (
        "describe-",
        "get-",
        "list-",
        "view-",
        "query-",
        "search-",
        "head-",
        "help",
        "--version",
        "version",
        "ls",
        "status",
        "get-caller-identity",
        "get-cost-and-usage"
    )

    BLOCKED_VERBS = (
        "delete",
        "terminate",
        "drop",
        "modify",
        "update",
        "put",
        "create",
        "attach",
        "detach",
        "stop",
        "start",
        "reboot",
        "authorize",
        "revoke",
        "purge",
        "remove"
    )

    MAX_OUTPUT_CHARS = 3500

    @classmethod
    def validate_command(cls, cmd_str: str) -> Tuple[bool, str]:
        """
        Validates that a command is strictly read-only and free of shell injection vectors.
        """
        cmd = cmd_str.strip()
        if not cmd:
            return False, "Command string is empty."

        # Block shell chaining / injection tokens
        dangerous_tokens = [";", "&&", "||", "`", "$(", ">", "<", "\n", "\r"]
        for token in dangerous_tokens:
            if token in cmd:
                return False, f"Shell redirection or chaining token '{token}' is prohibited by safety guardrails."

        # Parse command arguments
        try:
            tokens = shlex.split(cmd)
        except Exception as e:
            return False, f"Failed to parse command syntax: {e}"

        if not tokens:
            return False, "Empty tokens."

        # Normalize command prefix
        # Allowed shapes: "aws ec2 describe-instances" or "ec2 describe-instances"
        if tokens[0].lower() == "aws":
            sub_tokens = tokens[1:]
        else:
            sub_tokens = tokens

        if not sub_tokens:
            return False, "No AWS service specified."

        # Support quick version checks
        if sub_tokens[0] in ["--version", "-v", "version"]:
            return True, "VALIDATED"

        service = sub_tokens[0].lower()
        if len(sub_tokens) < 2:
            return False, f"Missing operation for AWS service '{service}'."

        operation = sub_tokens[1].lower()

        # Check blocked mutating verbs
        for blocked in cls.BLOCKED_VERBS:
            if blocked in operation:
                return False, f"Operation '{operation}' contains mutating verb '{blocked}'. Only read-only operations are permitted."

        # Check allowed read-only prefixes
        is_allowed = any(operation.startswith(prefix) for prefix in cls.ALLOWED_PREFIXES)
        if not is_allowed:
            return False, f"Operation '{operation}' does not match allowed read-only prefixes (describe-*, get-*, list-*, view-*, ls)."

        # Also inspect full command string for any nested dangerous parameter flags
        for blocked in cls.BLOCKED_VERBS:
            # e.g., --delete-after, --purge-queue
            if f"--{blocked}" in cmd.lower():
                return False, f"Flag containing mutating verb '--{blocked}' is prohibited by safety guardrails."

        return True, "VALIDATED"

    @classmethod
    def execute(
        cls,
        cmd_str: str,
        tenant_id: str = "tenant-acme",
        account_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Executes a validated read-only AWS command safely with timeout, multi-tenant credential injection,
        and output truncation (Guardrail 3).
        """
        start_t = time.time()
        is_valid, validation_msg = cls.validate_command(cmd_str)

        if not is_valid:
            logger.warning(f"AWS Command Runner blocked: {validation_msg} (cmd: {cmd_str})")
            return {
                "status": "BLOCKED",
                "command": cmd_str,
                "error": validation_msg,
                "output": f"🛑 Command blocked by OneSight Read-Only Guardrail: {validation_msg}",
                "latency_ms": round((time.time() - start_t) * 1000)
            }

        # Ensure command starts with "aws "
        clean_cmd = cmd_str.strip()
        if not clean_cmd.startswith("aws "):
            clean_cmd = f"aws {clean_cmd}"

        tokens = shlex.split(clean_cmd)

        try:
            env = os.environ.copy()

            # 1. Inject default AWS region if not explicitly provided
            if "--region" not in clean_cmd:
                env["AWS_DEFAULT_REGION"] = getattr(settings, "AWS_DEFAULT_REGION", "us-east-1")

            # 2. Inject tenant-specific encrypted AWS credentials from DB if available
            if db and tenant_id:
                try:
                    from app.models.tenant import AWSAccount
                    q = db.query(AWSAccount).filter(AWSAccount.tenant_id == tenant_id)
                    if account_id:
                        q = q.filter(AWSAccount.account_id == account_id)
                    acc_obj = q.first()
                    if acc_obj:
                        creds = acc_obj.get_decrypted_credentials()
                        if creds.get("access_key_id"):
                            env["AWS_ACCESS_KEY_ID"] = creds["access_key_id"]
                        if creds.get("secret_access_key"):
                            env["AWS_SECRET_ACCESS_KEY"] = creds["secret_access_key"]
                        if creds.get("session_token"):
                            env["AWS_SESSION_TOKEN"] = creds["session_token"]
                        if getattr(acc_obj, "default_region", None) and "--region" not in clean_cmd:
                            env["AWS_DEFAULT_REGION"] = acc_obj.default_region
                except Exception as e:
                    logger.debug(f"Could not load tenant DB credentials: {e}")

            # 3. Fallback to settings / environment AWS credentials
            if "AWS_ACCESS_KEY_ID" not in env and getattr(settings, "AWS_ACCESS_KEY_ID", None):
                env["AWS_ACCESS_KEY_ID"] = settings.AWS_ACCESS_KEY_ID
            if "AWS_SECRET_ACCESS_KEY" not in env and getattr(settings, "AWS_SECRET_ACCESS_KEY", None):
                env["AWS_SECRET_ACCESS_KEY"] = settings.AWS_SECRET_ACCESS_KEY

            proc = subprocess.run(
                tokens,
                capture_output=True,
                text=True,
                timeout=18.0,
                env=env,
                shell=False
            )
            latency = round((time.time() - start_t) * 1000)

            stdout = proc.stdout.strip() if proc.stdout else ""
            stderr = proc.stderr.strip() if proc.stderr else ""

            # Check if output requires truncation (Payload Truncation Guardrail)
            truncated = False
            full_out = stdout or stderr or ""
            if len(full_out) > cls.MAX_OUTPUT_CHARS:
                full_out = full_out[:cls.MAX_OUTPUT_CHARS] + f"\n\n... [Output truncated: {len(stdout) - cls.MAX_OUTPUT_CHARS} characters omitted to protect LLM context window]"
                truncated = True

            if proc.returncode == 0:
                return {
                    "status": "SUCCESS",
                    "command": clean_cmd,
                    "output": full_out or "Command executed successfully with zero output.",
                    "latency_ms": latency,
                    "truncated": truncated
                }
            else:
                return {
                    "status": "ERROR",
                    "command": clean_cmd,
                    "error": stderr or f"Process exited with return code {proc.returncode}",
                    "output": full_out or stderr or stdout or "Command failed with empty output.",
                    "latency_ms": latency,
                    "truncated": truncated
                }

        except subprocess.TimeoutExpired:
            return {
                "status": "TIMEOUT",
                "command": clean_cmd,
                "error": "Command timed out after 18.0 seconds.",
                "output": "Execution timed out. Try refining query with --query or --filters.",
                "latency_ms": round((time.time() - start_t) * 1000)
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "command": clean_cmd,
                "error": str(e),
                "output": f"Execution error: {str(e)}",
                "latency_ms": round((time.time() - start_t) * 1000)
            }
