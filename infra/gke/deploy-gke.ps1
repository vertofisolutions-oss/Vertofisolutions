# ─────────────────────────────────────────────────────────────────────────
# Deploy Vertofi backend to GKE Autopilot.
#
# Prereqs (run once, see setup-guide/02-GCP-COMPLETE-SETUP.md):
#   1. gcloud auth login  &&  gcloud config set project <PROJECT_ID>
#   2. terraform apply  (creates GKE, Cloud SQL, Memorystore, GCS, AR, runtime SA)
#   3. .\sync-secrets.ps1 -EnvFile ..\..\.env.production -ProjectId <PROJECT_ID>
#
# Frontend (web-landing/business/panels/admin) is deployed to Vercel, not here.
#
# Usage:
#   .\deploy-gke.ps1 -ProjectId my-proj -Region asia-south1 -ApiDomain api.vertofi.com
# ─────────────────────────────────────────────────────────────────────────
param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Region = "asia-south1",
  [string]$ClusterName = "vertofi-production",
  [string]$ApiDomain = "",                 # blank → expose gateway via plain LoadBalancer IP
  [string]$Tag = "latest",
  # Scaling profile:
  #   quotafit   = 1 replica/service, autoscaling+PDB OFF. Fits the 2 existing
  #                Autopilot nodes (SSD_TOTAL_GB quota = 250GB blocks a 3rd node).
  #                Safe default; the live cluster is at ~63/64 pods + ~90% CPU.
  #   production = per-tier replicas + HPA + PDB + right-sized requests for HA and
  #                speed. REQUIRES the SSD quota increase first (more nodes), else
  #                the extra replicas sit Pending. Run this the moment quota lands.
  [ValidateSet("quotafit", "production")][string]$ScaleProfile = "quotafit"
)

$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
$Chart = Join-Path $PSScriptRoot "..\..\deploy\helm\vertofi-service"
$AR = "$Region-docker.pkg.dev/$ProjectId/vertofi"
$RuntimeSA = "vertofi-runtime@$ProjectId.iam.gserviceaccount.com"

Write-Host "== Connecting to GKE Autopilot ($ClusterName / $Region) =="
gcloud config set project $ProjectId | Out-Null
gcloud container clusters get-credentials $ClusterName --region $Region --project $ProjectId
# Use a bearer token instead of the exec auth-plugin (avoids requiring
# gke-gcloud-auth-plugin). Token is valid ~1h, ample for a deploy run.
$ctxUser = "gke_${ProjectId}_${Region}_${ClusterName}"
kubectl config set-credentials $ctxUser --token=$(gcloud auth print-access-token) | Out-Null
kubectl get ns >$null 2>&1
if ($LASTEXITCODE -ne 0) { throw "Cannot reach the GKE cluster. Did 'terraform apply' finish?" }

# ── 1. External Secrets Operator + GCP Secret Manager store ───────────────
Write-Host "== Installing External Secrets Operator =="
helm repo add external-secrets https://charts.external-secrets.io 2>$null
helm repo update | Out-Null
helm upgrade --install external-secrets external-secrets/external-secrets `
  -n external-secrets --create-namespace --set installCRDs=true --timeout 15m

# Bind the ESO controller KSA to the runtime GCP SA via Workload Identity, then
# restart so pods pick up the annotation.
gcloud iam service-accounts add-iam-policy-binding $RuntimeSA `
  --role roles/iam.workloadIdentityUser `
  --member "serviceAccount:$ProjectId.svc.id.goog[external-secrets/external-secrets]" `
  --project $ProjectId | Out-Null
kubectl annotate serviceaccount external-secrets -n external-secrets `
  "iam.gke.io/gcp-service-account=$RuntimeSA" --overwrite

# Verify ESO is Available. Do NOT rollout-restart — on a full cluster the new
# pods can't schedule and the wait deadlocks; the running controller already
# has the WI annotation and syncs fine. kubectl wait is satisfied immediately
# when the deployments are already Available, and won't block if they are.
Write-Host "== Verifying External Secrets Operator is Available =="
kubectl wait --for=condition=Available deployment --all -n external-secrets --timeout=180s

Write-Host "== Applying ClusterSecretStore (gcp-secret-manager) =="
@"
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: $ProjectId
"@ | kubectl apply -f -

# ── 2. Backend services (frontend → Vercel) ───────────────────────────────
# name, port, namespace
$services = @(
  @("auth", 4001, "vertofi-identity"),
  @("tenant", 4002, "vertofi-identity"),
  @("access", 4003, "vertofi-identity"),
  @("api-gateway", 4000, "vertofi-gateway"),
  @("document", 4006, "vertofi-documents"),
  @("ocr", 4008, "vertofi-documents"),
  @("accounting-ledger", 4011, "vertofi-accounting"),
  @("reconciliation", 4013, "vertofi-accounting"),
  @("accounting-sync", 4017, "vertofi-accounting"),
  @("accounting", 4031, "vertofi-accounting"),
  @("bank-connector", 4015, "vertofi-connectors"),
  @("gst-connector", 4016, "vertofi-connectors"),
  @("vendor", 4023, "vertofi-connectors"),
  @("verification-connectors", 4029, "vertofi-connectors"),
  @("ai-gateway", 4010, "vertofi-intelligence"),
  @("categorization", 4012, "vertofi-intelligence"),
  @("bhs-engine", 4019, "vertofi-intelligence"),
  @("prediction", 4021, "vertofi-intelligence"),
  @("vbd", 4024, "vertofi-intelligence"),
  @("bhs-intelligence", 4026, "vertofi-intelligence"),
  @("benchmarks", 4027, "vertofi-intelligence"),
  @("exception-workflow", 4014, "vertofi-workflow"),
  @("onboarding", 4005, "vertofi-workflow"),
  @("lifeguard", 4022, "vertofi-workflow"),
  @("legal-cases", 4025, "vertofi-workflow"),
  @("warranty", 4028, "vertofi-workflow"),
  @("notification", 4009, "vertofi-engagement"),
  @("whatsapp", 4018, "vertofi-engagement"),
  @("reporting", 4020, "vertofi-engagement"),
  @("billing", 4007, "vertofi-commerce"),
  @("audit", 4004, "vertofi-commerce"),
  @("admin-console", 4030, "vertofi-commerce")
)

# ── Scaling tiers (used by the "production" profile) ──────────────────────
# HOT = latency-critical request path (the gateway funnel, auth, core APIs):
#       generous min replicas + HPA headroom + bigger CPU request so HPA % is
#       meaningful and pods aren't throttled under load.
# SUPPORT = user-facing but lighter services: HA pair + small HPA headroom.
# Everything else = event/worker services: 1 baseline + modest HPA on CPU.
# DB_POOL_MAX is tuned per tier so total Postgres connections at full HPA scale
# stay well under Cloud SQL's limit (sum(db-svc × maxReplicas × pool) < ~180).
$hotTier = @("api-gateway", "auth", "accounting", "ai-gateway", "document", "admin-console", "onboarding")
$supportTier = @("access", "tenant", "reporting", "whatsapp", "categorization", "bank-connector", "vendor", "lifeguard", "legal-cases", "warranty")

function Get-ScaleArgs([string]$svc) {
  if ($ScaleProfile -eq "quotafit") {
    # Quota-fit: 1 replica, no autoscaling/PDB — guarantees the workload fits the
    # 2 existing nodes and never triggers a (quota-blocked) node scale-up.
    return @("--set", "replicaCount=1", "--set", "autoscaling.enabled=false", "--set", "pdb.enabled=false")
  }
  # production profile
  if ($hotTier -contains $svc) {
    $min = 2; $max = 5; $cpu = "200m"; $mem = "192Mi"; $pool = "4"
    if ($svc -eq "api-gateway") { $max = 6 }   # the funnel — most headroom
  } elseif ($supportTier -contains $svc) {
    $min = 2; $max = 3; $cpu = "120m"; $mem = "160Mi"; $pool = "3"
  } else {
    $min = 1; $max = 3; $cpu = "100m"; $mem = "128Mi"; $pool = "3"
  }
  # PDB minAvailable=1 (NOT >= minReplicas) so Autopilot node maintenance/upgrades
  # can still evict one pod — a PDB that blocks all evictions deadlocks upgrades.
  return @(
    "--set", "autoscaling.enabled=true",
    "--set", "autoscaling.minReplicas=$min",
    "--set", "autoscaling.maxReplicas=$max",
    "--set", "autoscaling.targetCPUUtilizationPercentage=65",
    "--set", "resources.requests.cpu=$cpu",
    "--set", "resources.requests.memory=$mem",
    "--set", "pdb.enabled=true",
    "--set", "pdb.minAvailable=1",
    "--set-string", "env.DB_POOL_MAX=$pool"
  )
}

# Build a name → "host.namespace:port" cluster-DNS map for inter-service calls.
# Services live in different namespaces, so localhost defaults won't work — every
# caller must use cross-namespace DNS (svc.namespace.svc.cluster.local).
$dns = @{}
foreach ($s in $services) { $dns[$s[0]] = "http://$($s[0]).$($s[2]):$($s[1])" }
$aiGatewayUrl = $dns["ai-gateway"]

# The gateway proxies every /api/v1/<x> prefix to an upstream — give it the DNS
# of each one (matches the env var names in services/api-gateway/src/routes.ts).
$gatewayUrls = @{
  AUTH_URL = "auth"; ACCESS_URL = "access"; TENANT_URL = "tenant"; AUDIT_URL = "audit"
  ONBOARDING_URL = "onboarding"; DOCUMENT_URL = "document"; BILLING_URL = "billing"
  LEDGER_URL = "accounting-ledger"; NOTIFICATION_URL = "notification"
  RECONCILIATION_URL = "reconciliation"; EXCEPTION_URL = "exception-workflow"
  BANK_CONNECTOR_URL = "bank-connector"; GST_CONNECTOR_URL = "gst-connector"
  ACCOUNTING_SYNC_URL = "accounting-sync"; BHS_URL = "bhs-engine"; REPORTING_URL = "reporting"
  PREDICTION_URL = "prediction"; LIFEGUARD_URL = "lifeguard"; VENDOR_URL = "vendor"
  VBD_URL = "vbd"; LEGAL_URL = "legal-cases"; BHS_INTEL_URL = "bhs-intelligence"
  BENCHMARKS_URL = "benchmarks"; WARRANTY_URL = "warranty"
  VERIFICATION_URL = "verification-connectors"; ADMIN_CONSOLE_URL = "admin-console"
  ACCOUNTING_URL = "accounting"
}

foreach ($s in $services) {
  $name = $s[0]; $port = $s[1]; $ns = $s[2]
  Write-Host "== Deploying $name → $ns =="
  $helmArgs = @(
    "upgrade", "--install", $name, $Chart,
    "--namespace", $ns, "--create-namespace",
    "--set", "name=$name",
    "--set", "image.repository=$AR/$name",
    "--set", "image.tag=$Tag",
    "--set", "port=$port",
    "--set", "env.NODE_ENV=production",
    "--set", "serviceAccount.gcpServiceAccount=$RuntimeSA",
    "--set", "serviceMonitor.enabled=false",
    # Default-deny NetworkPolicy blocks intra/cross-namespace service calls on a
    # fresh cluster; disable for first launch (re-enable with per-service rules
    # once verified). GKE Autopilot still isolates the cluster from the internet.
    "--set", "networkPolicy.enabled=false"
    # NOTE: nodeSelector removed — ComputeClass NAP is in quota backoff.
    # Replicas / HPA / PDB / resources are set per-tier by Get-ScaleArgs below,
    # driven by -ScaleProfile (quotafit default; production after quota increase).
  )
  $helmArgs += Get-ScaleArgs $name
  # Service-specific non-secret env (secrets come from Secret Manager via ESO).
  switch ($name) {
    "api-gateway" {
      foreach ($k in $gatewayUrls.Keys) {
        $helmArgs += @("--set-string", "env.$k=$($dns[$gatewayUrls[$k]])")
      }
    }
    "document" { $helmArgs += @("--set-string", "env.S3_ENDPOINT=https://storage.googleapis.com", "--set", "env.S3_FORCE_PATH_STYLE=true") }
    "ai-gateway" { $helmArgs += @("--set", "env.AI_USD_PER_1K_TOKENS=0.0006") }
    # Services that call the AI gateway over HTTP need its cluster DNS.
    "categorization" { $helmArgs += @("--set-string", "env.AI_GATEWAY_URL=$aiGatewayUrl") }
    "vbd"            { $helmArgs += @("--set-string", "env.AI_GATEWAY_URL=$aiGatewayUrl") }
    "whatsapp"       { $helmArgs += @("--set-string", "env.AI_GATEWAY_URL=$aiGatewayUrl", "--set-string", "env.ACCOUNTING_URL=$($dns['accounting'])", "--set-string", "env.REPORTING_URL=$($dns['reporting'])", "--set-string", "env.BHS_URL=$($dns['bhs-engine'])", "--set-string", "env.GST_CONNECTOR_URL=$($dns['gst-connector'])") }
    "legal-cases"    { $helmArgs += @("--set-string", "env.AI_GATEWAY_URL=$aiGatewayUrl") }
    "accounting"     { $helmArgs += @("--set-string", "env.AI_GATEWAY_URL=$aiGatewayUrl") }
  }
  & helm @helmArgs

  # Workload Identity: bind this service's KSA (created by the chart) to the
  # runtime GCP SA so the pod can read Secret Manager / Cloud SQL / GCS.
  gcloud iam service-accounts add-iam-policy-binding $RuntimeSA `
    --role roles/iam.workloadIdentityUser `
    --member "serviceAccount:$ProjectId.svc.id.goog[$ns/$name]" `
    --project $ProjectId --quiet | Out-Null
}

# ── 3. Expose the API gateway publicly (for the Vercel frontend to call) ──
if ($ApiDomain) {
  Write-Host "== Provisioning HTTPS for $ApiDomain (Google-managed cert + static IP) =="
  # Reserve a stable global static IP so the DNS A record never changes.
  if (-not (gcloud compute addresses describe vertofi-api-ip --global --project $ProjectId 2>$null)) {
    gcloud compute addresses create vertofi-api-ip --global --project $ProjectId | Out-Null
  }
  $apiIp = gcloud compute addresses describe vertofi-api-ip --global --project $ProjectId --format="value(address)"
  @"
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: vertofi-api-cert
  namespace: vertofi-gateway
spec:
  domains:
    - $ApiDomain
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: vertofi-gateway
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: api-gateway
  ports:
    - port: 4000
      targetPort: 4000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vertofi-api-ingress
  namespace: vertofi-gateway
  annotations:
    kubernetes.io/ingress.class: gce
    kubernetes.io/ingress.global-static-ip-name: vertofi-api-ip
    networking.gke.io/managed-certificates: vertofi-api-cert
spec:
  rules:
    - host: $ApiDomain
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 4000
"@ | kubectl apply -f -
  Write-Host "API static IP: $apiIp  →  create DNS A record: $ApiDomain -> $apiIp"
} else {
  Write-Host "== Exposing api-gateway via LoadBalancer (no domain given) =="
  kubectl expose deployment api-gateway -n vertofi-gateway --type=LoadBalancer `
    --name=api-gateway-lb --port=80 --target-port=4000 2>$null
  Write-Host "Get the external IP with:"
  Write-Host "  kubectl get svc api-gateway-lb -n vertofi-gateway"
}

Write-Host ""
Write-Host "Backend deployed. Set NEXT_PUBLIC_API_URL in Vercel to the gateway URL above."
