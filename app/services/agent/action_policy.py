"""Code-governed execution policy for Operations Agent tools.

The model can recommend a tool, but it never selects whether that tool may
run unattended.  This module is the single policy decision point for an
automated action request.
"""
from dataclasses import dataclass
from typing import Any


AUTO_ALLOWED = "AUTO_ALLOWED"
APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
NEVER_AUTOMATE = "NEVER_AUTOMATE"
VALID_EXECUTION_POLICIES = frozenset({AUTO_ALLOWED, APPROVAL_REQUIRED, NEVER_AUTOMATE})

OUTCOME_AUTOMATIC = "automatic"
OUTCOME_APPROVAL = "approval_required"
OUTCOME_BLOCKED = "blocked"


@dataclass(frozen=True)
class ActionPolicyDecision:
    policy: str
    outcome: str
    reason: str


def evaluate_automated_action(tool: Any) -> ActionPolicyDecision:
    """Return the deterministic unattended-execution decision for ``tool``."""
    policy = tool.execution_policy
    if policy not in VALID_EXECUTION_POLICIES:
        return ActionPolicyDecision(policy, OUTCOME_BLOCKED, "Tool has an invalid execution policy")
    if policy == NEVER_AUTOMATE:
        return ActionPolicyDecision(policy, OUTCOME_BLOCKED, "Tool is explicitly forbidden from unattended execution")
    if policy == APPROVAL_REQUIRED:
        return ActionPolicyDecision(policy, OUTCOME_APPROVAL, "Human approval is required by code policy")

    if tool.classification == "read":
        return ActionPolicyDecision(policy, OUTCOME_AUTOMATIC, "Read-only tool")
    if not tool.auto_execute:
        return ActionPolicyDecision(policy, OUTCOME_BLOCKED, "Tool is not enabled for the unattended executor")
    if tool.risk_level != "low":
        return ActionPolicyDecision(policy, OUTCOME_BLOCKED, "Only low-risk actions may run unattended")
    if not tool.idempotent:
        return ActionPolicyDecision(policy, OUTCOME_BLOCKED, "Unattended actions must be idempotent")
    if not tool.self_revalidating and not (tool.capture_state and tool.revalidate_state):
        return ActionPolicyDecision(policy, OUTCOME_BLOCKED, "Unattended action has no live-state revalidation")

    return ActionPolicyDecision(
        policy,
        OUTCOME_AUTOMATIC,
        "Low-risk, internal, idempotent action with live-state revalidation",
    )
