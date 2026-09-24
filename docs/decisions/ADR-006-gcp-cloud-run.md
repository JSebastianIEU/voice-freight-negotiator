# ADR-006: GCP Cloud Run for the agent worker and the web client

**Status:** accepted · **Date:** 2026-09-24

## Context
The demo should be reachable at any time without a laptop running. Two components: a
request-driven web app and a long-lived worker that keeps a WebSocket open to LiveKit and
receives jobs from it.

## Decision
Both run on Cloud Run in one GCP project, deployed by GitHub Actions on push to `main`:
- **web:** default Cloud Run behaviour, scales to zero.
- **agent worker:** `min-instances=1` and CPU always allocated. The worker is not
  request-driven; if the platform throttles the idle container, the worker silently drops
  off LiveKit and no call gets answered.
- Secrets (LiveKit key/secret) in Secret Manager, mounted as environment variables.
- Images in Artifact Registry. GitHub authenticates with Workload Identity Federation, so no
  service-account JSON key is stored anywhere.
- A billing budget alert is created before the first deploy.

## Alternatives considered
- **LiveKit Cloud agent hosting (`lk agent create`):** zero infrastructure, the easiest path.
  Not chosen because showing cloud operations (containers, secrets, CI/CD) is part of the goal.
- **GKE / a VM:** more to operate than the project needs.
- **Vercel for the web app:** fine technically; kept everything on GCP to have one bill and
  one IAM model.

## Consequences
- The always-on worker is the only fixed monthly cost; it is documented in the README.
- Cloud Run region is chosen close to the LiveKit Cloud region to keep the network part of the
  latency budget small.
