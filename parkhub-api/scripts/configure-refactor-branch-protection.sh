#!/usr/bin/env bash

set -euo pipefail

repo="${1:-mymikasa/parkhub}"
branch="${2:-refactor/microservices}"
workflow_name="${3:-Refactor Pipeline}"
encoded_branch="${branch//\//%2F}"

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${repo}/branches/${encoded_branch}/protection" \
  -f required_status_checks.strict=true \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_pull_request_reviews.required_approving_review_count=2 \
  -f restrictions= \
  -f required_status_checks.contexts[]="${workflow_name}"
