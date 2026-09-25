# Deploying to Google Cloud

Two containers on Cloud Run, built and deployed by GitHub Actions on every push to `main`.
This page is the operator's view; the reasoning is in [ADR-006](decisions/ADR-006-gcp-cloud-run.md)
and the diagram in [architecture.md § 9](architecture.md#9-deployment).

```
push to main ─► GitHub Actions ─► docker build ×2 ─► Artifact Registry ─► gcloud run services replace ×2
                (OIDC → WIF, no key)                  freight/agent, freight/web        agent (min 1, CPU on)
                                                                                        web   (scale to zero)
```

## The pieces

| File | What it is |
|---|---|
| `deploy/agent.Dockerfile` | Python 3.12 slim, uv-locked dependencies, non-root, model weights downloaded at build |
| `deploy/web.Dockerfile` | Node 22 alpine, Next.js standalone output, non-root |
| `deploy/cloudrun/agent.yaml` | Cloud Run service: **min 1 instance, CPU always allocated**, internal ingress, startup probe on the worker's `/` |
| `deploy/cloudrun/web.yaml` | Cloud Run service: scale to zero, public ingress |
| `deploy/bootstrap.sh` | One-time project setup: APIs, registry, secrets, service accounts, Workload Identity Federation, budget alert |
| `.github/workflows/ci.yml` | Every PR: ruff, pytest, eslint, tsc, `next build`, and a build of both images |
| `.github/workflows/deploy.yml` | Push to `main`: build, push, deploy |

## Why the worker is configured the way it is

The agent worker is not a web server. It opens a WebSocket *to* LiveKit Cloud and waits for
jobs; LiveKit dispatches one whenever a room asks for `freight-negotiator`. Three consequences
on Cloud Run, all in `deploy/cloudrun/agent.yaml`:

- **`minScale: 1`.** With zero instances there is no WebSocket and nobody answers the call.
  Cloud Run's default (scale to zero) is exactly wrong for this workload.
- **`cpu-throttling: "false"`.** By default Cloud Run only gives a container CPU while it is
  handling an HTTP request. A worker handles no HTTP requests, so it would be throttled the
  whole time, miss its WebSocket keep-alives and drop off LiveKit without an error. "CPU always
  allocated" is the single setting that makes agents work on serverless.
- **Startup probe on `GET /`.** The framework serves a health endpoint on the port it is
  given; `main.py` reads `PORT` from the environment so Cloud Run and the worker agree. The
  probe gives the container up to two minutes to load the VAD model before it counts as up.
- **`ingress: internal`.** Nothing needs to reach the worker from the internet; the health
  endpoint is for the platform. The web service, by contrast, is public.

The web service is the opposite case: request-driven, stateless, scales to zero. Its only
secret use is signing room tokens in `/api/token`, with the LiveKit secret injected from
Secret Manager as an environment variable.

## Secrets and identity

- The LiveKit key and secret live in **Secret Manager** (`livekit-api-key`, `livekit-api-secret`),
  typed in once by `bootstrap.sh`. They are never in git, never in GitHub, never in an image.
- Each service runs as its own service account (`agent-runtime`, `web-runtime`) whose only
  permission is reading those two secrets.
- GitHub Actions authenticates with **Workload Identity Federation**: the workflow's OIDC
  token is exchanged for a short-lived credential of `github-deployer`, and the provider's
  attribute condition only accepts tokens from this repository. No service-account JSON key
  exists anywhere, so there is nothing to leak or rotate.
- `github-deployer` can push images, deploy Cloud Run services and act as the two runtime
  accounts. It cannot read the secrets itself.

## Cost

- The worker is the only fixed cost: one always-on instance, 1 vCPU / 1 GiB. Cloud Run
  bills CPU-always-allocated instances per second of instance time; the exact monthly figure
  goes in the README once the first invoice exists (no invented numbers).
- The web service costs nothing when idle.
- `bootstrap.sh` creates a **billing budget** (default `20USD` / month; set `BUDGET_AMOUNT`
  in the billing account's own currency, e.g. `80000COP`, or the API rejects it) with alerts
  at 50, 90 and 100 % before anything is deployed. LiveKit Inference has its own spend cap on the
  LiveKit Cloud side.
- To stop paying entirely: `gcloud run services delete agent --region <region>`. The web
  service can stay; it scales to zero.

## First-time setup

```bash
gcloud auth login
gcloud billing accounts list                       # note the account id

PROJECT_ID=<project> BILLING_ACCOUNT=<XXXXXX-XXXXXX-XXXXXX> \
GITHUB_REPO=JSebastianIEU/voice-freight-negotiator REGION=europe-west1 \
./deploy/bootstrap.sh
```

The script prints the five repository variables to set in GitHub (Settings → Secrets and
variables → Actions → Variables): `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`,
`GCP_DEPLOYER_SA`, `LIVEKIT_URL`. Then push to `main` or run the `deploy` workflow by hand;
the last step prints the public URL of the web client.

Region: pick the Cloud Run region closest to the LiveKit Cloud project's region (the LiveKit
dashboard shows it). The worker's turn-detection round trip and the media path both cross
that distance on every turn.

## First deploy: what went wrong and why (2026-09-25)

Recorded because each one is a real operator lesson:

- **`gcloud run services replace` does not make a service public.** IAM is separate from
  the service spec; the URL answered 403 until `allUsers` got `roles/run.invoker`. The
  deploy workflow now has a "Make web public" step.
- **Google Workspace organizations restrict IAM members to their own domain** by default
  (`iam.allowedPolicyMemberDomains`), so `allUsers` was rejected with "do not belong to a
  permitted customer". `bootstrap.sh` sets a project-level `allowAll` exception; it takes
  about two minutes to propagate, during which the binding still fails.
- **The pool binding fails right after the pool is created** (IAM eventual consistency);
  the script retries.
- **A budget must be in the billing account's currency** (COP here); any other currency is
  a bare `INVALID_ARGUMENT`.

## Checking a deployment

```bash
gcloud run services list --region europe-west1
gcloud run services logs read agent --region europe-west1 --limit 50     # "registered worker" = connected to LiveKit
gcloud run services describe web --region europe-west1 --format 'value(status.url)'
```

Open the URL from a phone, start a call, and check the agent logs for the per-turn
`turn latency e2e=... ms` lines.

## Building the images locally

```bash
docker build -f deploy/agent.Dockerfile -t freight-agent agent/
docker build -f deploy/web.Dockerfile   -t freight-web   web/
docker run --rm --env-file agent/.env.local -e PORT=8080 -p 8080:8080 freight-agent
docker run --rm --env-file web/.env.local   -p 3000:8080 freight-web
```
