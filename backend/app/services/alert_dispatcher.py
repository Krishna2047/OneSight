import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session
from app.models.alert import AlertRule, AlertHistory, AlertSeverity
from app.core.config import settings

logger = logging.getLogger("onesight.alerts")

class AlertDispatcher:
    """
    Handles formatting and dispatching of cloud billing alerts
    across Slack, Discord, Webhooks, and Email.
    """

    @staticmethod
    def _get_severity_color_hex(severity: AlertSeverity) -> str:
        if severity == AlertSeverity.CRITICAL:
            return "#EF4444" # Red
        elif severity in [AlertSeverity.WARNING, AlertSeverity.HIGH]:
            return "#F59E0B" # Amber
        return "#3B82F6"     # Blue

    @staticmethod
    def _get_discord_color_int(severity: AlertSeverity) -> int:
        if severity == AlertSeverity.CRITICAL:
            return 15680324 # 0xEF4444
        elif severity in [AlertSeverity.WARNING, AlertSeverity.HIGH]:
            return 16096779 # 0xF59E0B
        return 3899894     # 0x3B82F6

    @classmethod
    def send_slack(cls, webhook_url: Optional[str], payload_data: Dict[str, Any]) -> Dict[str, Any]:
        """Formats and sends a Slack Block Kit message."""
        severity = payload_data.get("severity", "WARNING")
        title = payload_data.get("title", "Cloud Billing Alert")
        message = payload_data.get("message", "")
        provider = payload_data.get("provider", "Multi-Cloud")
        service = payload_data.get("service", "N/A")
        cost_delta = payload_data.get("cost_delta", 0.0)
        pct_deviation = payload_data.get("pct_deviation", 0.0)

        slack_body = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"🚨 OneSight Alert: {title}",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Severity:* `{severity}` | *Provider:* *{provider}* | *Service:* `{service}`\n{message}"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Impact Delta:*\n+${cost_delta:,.2f}"},
                        {"type": "mrkdwn", "text": f"*Spike Increase:*\n+{pct_deviation:.1f}%"},
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"📍 *OneSight Agentic Platform* | Detected at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
                        }
                    ]
                }
            ]
        }

        target_url = webhook_url or settings.DEFAULT_SLACK_WEBHOOK
        if target_url and target_url.startswith("http"):
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(target_url, json=slack_body)
                    resp.raise_for_status()
                    return {"status": "SENT", "channel": "SLACK", "details": resp.text, "payload": slack_body}
            except Exception as e:
                logger.error(f"Slack webhook failed: {e}")
                return {"status": "FAILED", "channel": "SLACK", "error": str(e), "payload": slack_body}
        
        return {
            "status": "SIMULATED",
            "channel": "SLACK",
            "note": "Simulated dispatch (configure live webhook in settings to post to real Slack channel)",
            "payload": slack_body
        }

    @classmethod
    def send_discord(cls, webhook_url: Optional[str], payload_data: Dict[str, Any]) -> Dict[str, Any]:
        """Formats and sends a Discord Webhook embed."""
        severity = payload_data.get("severity", "WARNING")
        title = payload_data.get("title", "Cloud Billing Alert")
        message = payload_data.get("message", "")
        provider = payload_data.get("provider", "Multi-Cloud")
        service = payload_data.get("service", "N/A")
        cost_delta = payload_data.get("cost_delta", 0.0)
        pct_deviation = payload_data.get("pct_deviation", 0.0)

        discord_body = {
            "embeds": [
                {
                    "title": f"🚨 OneSight Alert: {title}",
                    "description": message,
                    "color": cls._get_discord_color_int(severity),
                    "fields": [
                        {"name": "Provider", "value": str(provider), "inline": True},
                        {"name": "Service", "value": str(service), "inline": True},
                        {"name": "Severity", "value": str(severity), "inline": True},
                        {"name": "Spike %", "value": f"+{pct_deviation:.1f}%", "inline": True},
                        {"name": "Financial Delta", "value": f"+${cost_delta:,.2f}", "inline": True},
                        {"name": "Action Status", "value": "AI RCA Available", "inline": True}
                    ],
                    "footer": {"text": "OneSight Agentic AI FinOps"},
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        }

        target_url = webhook_url or settings.DEFAULT_DISCORD_WEBHOOK
        if target_url and target_url.startswith("http"):
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(target_url, json=discord_body)
                    resp.raise_for_status()
                    return {"status": "SENT", "channel": "DISCORD", "details": resp.text, "payload": discord_body}
            except Exception as e:
                logger.error(f"Discord webhook failed: {e}")
                return {"status": "FAILED", "channel": "DISCORD", "error": str(e), "payload": discord_body}

        return {
            "status": "SIMULATED",
            "channel": "DISCORD",
            "note": "Simulated dispatch (provide Discord Webhook URL to deliver to live Discord channel)",
            "payload": discord_body
        }

    @classmethod
    def send_webhook(cls, webhook_url: Optional[str], payload_data: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches an enterprise JSON payload to custom webhooks or PagerDuty."""
        standard_payload = {
            "source": "OneSight-FinOps-Platform",
            "event_type": "billing.spike.alert",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload_data
        }

        target_url = webhook_url or settings.DEFAULT_GENERIC_WEBHOOK
        if target_url and target_url.startswith("http"):
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(target_url, json=standard_payload)
                    resp.raise_for_status()
                    return {"status": "SENT", "channel": "WEBHOOK", "details": resp.text, "payload": standard_payload}
            except Exception as e:
                logger.error(f"Generic webhook failed: {e}")
                return {"status": "FAILED", "channel": "WEBHOOK", "error": str(e), "payload": standard_payload}

        return {
            "status": "SIMULATED",
            "channel": "WEBHOOK",
            "note": "Simulated webhook payload ready for API consumers",
            "payload": standard_payload
        }

    @classmethod
    def send_email(cls, recipient_email: Optional[str], payload_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generates structured HTML email summary."""
        title = payload_data.get("title", "OneSight Cloud Cost Alert")
        provider = payload_data.get("provider", "Multi-Cloud")
        service = payload_data.get("service", "N/A")
        cost_delta = payload_data.get("cost_delta", 0.0)
        pct_deviation = payload_data.get("pct_deviation", 0.0)
        message = payload_data.get("message", "")

        html_template = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 20px; color: white;">
                <h2 style="margin: 0; font-size: 20px;">🚨 OneSight: {title}</h2>
                <p style="margin: 5px 0 0; color: #94a3b8; font-size: 13px;">Cloud Billing Anomaly Detected</p>
            </div>
            <div style="padding: 24px; background-color: #ffffff;">
                <p style="font-size: 15px; color: #334155;">{message}</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                    <tr style="background-color: #f8fafc;">
                        <td style="padding: 10px; font-weight: bold; color: #64748b; font-size: 13px;">Provider</td>
                        <td style="padding: 10px; color: #0f172a; font-size: 14px;">{provider}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold; color: #64748b; font-size: 13px;">Service</td>
                        <td style="padding: 10px; color: #0f172a; font-size: 14px;">{service}</td>
                    </tr>
                    <tr style="background-color: #f8fafc;">
                        <td style="padding: 10px; font-weight: bold; color: #64748b; font-size: 13px;">Cost Spike</td>
                        <td style="padding: 10px; color: #dc2626; font-size: 14px; font-weight: bold;">+${cost_delta:,.2f} (+{pct_deviation:.1f}%)</td>
                    </tr>
                </table>
            </div>
        </div>
        """

        return {
            "status": "SIMULATED",
            "channel": "EMAIL",
            "recipient": recipient_email or settings.DEFAULT_ALERT_EMAIL or "devops-team@company.internal",
            "payload": {"html": html_template, "subject": f"🚨 OneSight Alert: {title}"}
        }

    @classmethod
    def dispatch_all(
        cls,
        db: Session,
        rule_name: str,
        channels: List[str],
        payload_data: Dict[str, Any],
        webhook_override: Optional[str] = None
    ) -> List[AlertHistory]:
        """
        Dispatches alerts to all target channels and logs them in AlertHistory table.
        """
        history_records: List[AlertHistory] = []

        for ch in channels:
            ch_upper = ch.upper()
            result: Dict[str, Any] = {}

            if ch_upper == "SLACK":
                result = cls.send_slack(webhook_override, payload_data)
            elif ch_upper == "DISCORD":
                result = cls.send_discord(webhook_override, payload_data)
            elif ch_upper == "WEBHOOK":
                result = cls.send_webhook(webhook_override, payload_data)
            elif ch_upper == "EMAIL":
                result = cls.send_email(None, payload_data)

            if result:
                hist = AlertHistory(
                    rule_name=rule_name,
                    channel=ch_upper,
                    severity=payload_data.get("severity", AlertSeverity.WARNING),
                    title=payload_data.get("title", rule_name),
                    message=payload_data.get("message", ""),
                    status=result.get("status", "SENT"),
                    response_payload=result
                )
                db.add(hist)
                history_records.append(hist)

        db.commit()
        return history_records
