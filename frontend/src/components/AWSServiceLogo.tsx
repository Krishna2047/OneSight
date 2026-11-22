"use client";

import React, { useState } from "react";
import Image from "next/image";

interface AWSServiceLogoProps {
  serviceName: string;
  className?: string;
  size?: number;
}

export function getAWSServiceLogoUrl(serviceName: string): string {
  const s = (serviceName || "").toLowerCase().trim();

  // Compute
  if (s.includes("compute") || s.includes("ec2") || s.includes("elastic compute")) {
    return "/aws-icons/ec2.svg";
  }
  if (s.includes("lambda")) {
    return "/aws-icons/lambda.svg";
  }
  if (s.includes("eks") || s.includes("kubernetes")) {
    return "/aws-icons/eks.svg";
  }
  if (s.includes("ecs") || s.includes("container service")) {
    return "/aws-icons/ecs.svg";
  }

  // Security & Identity
  if (s.includes("guardduty")) {
    return "/aws-icons/guardduty.svg";
  }
  if (s.includes("security hub") || s.includes("securityhub")) {
    return "/aws-icons/security-hub.svg";
  }
  if (s.includes("inspector")) {
    return "/aws-icons/inspector.svg";
  }
  if (s.includes("kms") || s.includes("key management")) {
    return "/aws-icons/kms.svg";
  }

  // Management & Governance
  if (s.includes("cloudwatch")) {
    return "/aws-icons/cloudwatch.svg";
  }
  if (s.includes("config")) {
    return "/aws-icons/config.svg";
  }
  if (s.includes("organization")) {
    return "/aws-icons/organizations.svg";
  }

  // Storage & Database
  if (s.includes("s3") || s.includes("simple storage")) {
    return "/aws-icons/s3.svg";
  }
  if (s.includes("rds") || s.includes("relational database")) {
    return "/aws-icons/rds.svg";
  }
  if (s.includes("dynamodb")) {
    return "/aws-icons/dynamodb.svg";
  }

  // Networking & Content Delivery
  if (s.includes("vpc") || s.includes("virtual private cloud") || s.includes("nat gateway")) {
    return "/aws-icons/vpc.svg";
  }
  if (s.includes("load balancing") || s.includes("load balancer") || s.includes("elb")) {
    return "/aws-icons/elb.svg";
  }
  if (s.includes("global accelerator")) {
    return "/aws-icons/global-accelerator.svg";
  }
  if (s.includes("route 53") || s.includes("route53") || s.includes("dns")) {
    return "/aws-icons/route-53.svg";
  }

  // Analytics & AI / ML
  if (s.includes("kinesis")) {
    return "/aws-icons/kinesis.svg";
  }
  if (
    s.includes("bedrock") ||
    s.includes("claude") ||
    s.includes("sagemaker") ||
    s.includes("anthropic") ||
    s.includes("genai") ||
    s.includes("ai")
  ) {
    return "/aws-icons/sagemaker.svg";
  }

  // Cost Management & Billing
  if (s.includes("cost explorer")) {
    return "/aws-icons/cost-explorer.svg";
  }
  if (s.includes("budget")) {
    return "/aws-icons/budgets.svg";
  }
  if (s.includes("tax") || s.includes("vat") || s.includes("billing") || s.includes("support")) {
    return "/aws-icons/cost-management.svg";
  }

  // Default Fallback
  return "/aws-icons/cost-management.svg";
}

/**
 * Renders the official AWS Architecture Service SVG Logo with smooth fallback.
 */
export function AWSServiceLogo({
  serviceName,
  className = "w-6 h-6",
  size = 28,
}: AWSServiceLogoProps) {
  const [error, setError] = useState(false);
  const iconUrl = getAWSServiceLogoUrl(serviceName);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0 ${className}`}
      >
        AWS
      </div>
    );
  }

  return (
    <img
      src={iconUrl}
      alt={serviceName}
      width={size}
      height={size}
      onError={() => setError(true)}
      className={`object-contain shrink-0 transition-transform duration-150 group-hover:scale-105 ${className}`}
      loading="lazy"
    />
  );
}
