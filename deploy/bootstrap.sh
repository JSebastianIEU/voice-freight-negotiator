#!/usr/bin/env bash
# One-time GCP setup for this project. Run from the repo root on a machine with gcloud
# logged in (`gcloud auth login`). Safe to re-run: every step is create-if-missing.
#
#   PROJECT_ID=my-project BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX GITHUB_REPO=JSebastianIEU/voice-freight-negotiator \
#   ./deploy/bootstrap.sh
#
# What it creates, and why (details in docs/deploy.md):
#   APIs                 Cloud Run, Artifact Registry, Secret Manager, IAM credentials, Billing budgets
#   Artifact Registry    one Docker repository, "freight", for the two images
#   Secret Manager       livekit-api-key / livekit-api-secret, values typed in, never in git or CI
#   Service accounts     agent-runtime and web-runtime (read their secrets, nothing else);
#                        github-deployer (push images, deploy services, act as the runtime SAs)
#   Workload Identity    a pool + GitHub OIDC provider restricted to this repository, so
#                        GitHub Actions deploys with no stored key
#   Budget alert         emails at 50 / 90 / 100 % of a monthly amount, before the first deploy
#
# BUDGET_AMOUNT must be in the billing account's own currency (gcloud billing accounts
# describe <id> shows currencyCode); the API rejects any other currency with a bare
# INVALID_ARGUMENT. Default 20USD; e.g. BUDGET_AMOUNT=80000COP for a COP account.
set -euo pipefail

: "${PROJECT_ID:?set PROJECT_ID}"
: "${BILLING_ACCOUNT:?set BILLING_ACCOUNT (gcloud billing accounts list)}"
: "${GITHUB_REPO:?set GITHUB_REPO as owner/name}"
REGION="${REGION:-europe-west1}"
BUDGET_AMOUNT="${BUDGET_AMOUNT:-20USD}"

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format 'value(projectNumber)')

echo "== APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  billingbudgets.googleapis.com

echo "== Artifact Registry"
gcloud artifacts repositories describe freight --location "$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create freight --location "$REGION" --repository-format docker \
    --description "voice-freight-negotiator images"

echo "== Secrets (values are prompted, never echoed)"
for name in livekit-api-key livekit-api-secret; do
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    gcloud secrets create "$name" --replication-policy automatic
    read -r -s -p "value for $name: " value; echo
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=-
    unset value
  fi
done

echo "== Runtime service accounts"
for sa in agent-runtime web-runtime; do
  gcloud iam service-accounts describe "$sa@$PROJECT_ID.iam.gserviceaccount.com" >/dev/null 2>&1 ||
    gcloud iam service-accounts create "$sa" --display-name "$sa"
  for secret in livekit-api-key livekit-api-secret; do
    gcloud secrets add-iam-policy-binding "$secret" \
      --member "serviceAccount:$sa@$PROJECT_ID.iam.gserviceaccount.com" \
      --role roles/secretmanager.secretAccessor --quiet >/dev/null
  done
done

echo "== Deployer service account (used by GitHub Actions)"
DEPLOYER="github-deployer@$PROJECT_ID.iam.gserviceaccount.com"
gcloud iam service-accounts describe "$DEPLOYER" >/dev/null 2>&1 ||
  gcloud iam service-accounts create github-deployer --display-name "GitHub Actions deployer"
for role in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$DEPLOYER" \
    --role "$role" --quiet >/dev/null
done
# Deploying a service that runs as agent-runtime/web-runtime requires "act as" on them.
for sa in agent-runtime web-runtime; do
  gcloud iam service-accounts add-iam-policy-binding "$sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --member "serviceAccount:$DEPLOYER" --role roles/iam.serviceAccountUser --quiet >/dev/null
done

echo "== Workload Identity Federation for $GITHUB_REPO"
gcloud iam workload-identity-pools describe github --location global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --location global --display-name "GitHub Actions"
gcloud iam workload-identity-pools providers describe github-oidc \
  --workload-identity-pool github --location global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc github-oidc \
    --workload-identity-pool github --location global \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition "assertion.repository == '$GITHUB_REPO'"
# A pool created seconds ago is not always visible to IAM yet; the binding then fails
# with a misleading PERMISSION_DENIED. Retry a few times before giving up.
for attempt in 1 2 3 4 5 6; do
  if gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" \
    --role roles/iam.workloadIdentityUser \
    --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$GITHUB_REPO" \
    --quiet >/dev/null 2>&1; then
    break
  fi
  [ "$attempt" -eq 6 ] && { echo "could not bind the pool to $DEPLOYER after 6 attempts"; exit 1; }
  echo "  pool not visible to IAM yet, retrying in 10 s ($attempt/6)"; sleep 10
done

echo "== Budget alert: $BUDGET_AMOUNT / month"
if ! gcloud billing budgets list --billing-account "$BILLING_ACCOUNT" --format 'value(displayName)' | grep -qx "voice-freight-negotiator"; then
  gcloud billing budgets create --billing-account "$BILLING_ACCOUNT" \
    --display-name "voice-freight-negotiator" \
    --budget-amount "$BUDGET_AMOUNT" \
    --filter-projects "projects/$PROJECT_NUMBER" \
    --threshold-rule percent=0.5 --threshold-rule percent=0.9 --threshold-rule percent=1.0
fi

cat <<EOF

Done. Set these repository variables (GitHub → Settings → Secrets and variables → Actions → Variables):

  GCP_PROJECT_ID    $PROJECT_ID
  GCP_REGION        $REGION
  GCP_WIF_PROVIDER  projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-oidc
  GCP_DEPLOYER_SA   $DEPLOYER
  LIVEKIT_URL       wss://<your-project>.livekit.cloud

Then push to main (or run the "deploy" workflow by hand) and read the web URL at the end of the job.
EOF
