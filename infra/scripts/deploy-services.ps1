# Refresh PATH to make sure all tools are available
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Get AWS Account ID
$accountId = aws sts get-caller-identity --query Account --output text
Write-Host "AWS Account ID: $accountId"

# Update Kubeconfig
Write-Host "Updating local kubeconfig for EKS..."
aws eks update-kubeconfig --name vertofi-production --region ap-south-1

# Verify connection
$nodes = kubectl get nodes
if (-not $nodes) {
    Write-Error "Could not connect to EKS cluster! Please check EKS cluster status."
    exit 1
}

# Create Namespaces
Write-Host "Creating Kubernetes namespaces..."
$namespaces = @(
    "vertofi-identity", "vertofi-gateway", "vertofi-documents", 
    "vertofi-accounting", "vertofi-connectors", "vertofi-intelligence", 
    "vertofi-workflow", "vertofi-engagement", "vertofi-commerce", 
    "vertofi-observability", "vertofi-frontend"
)
foreach ($ns in $namespaces) {
    kubectl create namespace $ns 2>$null
    Write-Host "Namespace $ns checked/created."
}

# ----------------------------------------------------
# 1. Install External Secrets Operator (ESO)
# ----------------------------------------------------
Write-Host "Installing External Secrets Operator..."
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm upgrade --install external-secrets external-secrets/external-secrets `
  -n external-secrets --create-namespace `
  --set installCRDs=true

# Create IAM policy for Secrets Manager if not exists
$smPolicyArn = aws iam list-policies --query "Policies[?PolicyName=='VertofiSecretsManagerPolicy'].Arn" --output text
if (-not $smPolicyArn) {
    Write-Host "Creating VertofiSecretsManagerPolicy IAM policy..."
    $smPolicyJson = '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret"
                ],
                "Resource": "arn:aws:secretsmanager:ap-south-1:*:secret:vertofi/production/*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "secretsmanager:ListSecrets",
                    "secretsmanager:BatchGetSecretValue"
                ],
                "Resource": "*"
            }
        ]
    }'
    $smPolicyPath = Join-Path $PSScriptRoot "sm-policy.json"
    [System.IO.File]::WriteAllText($smPolicyPath, $smPolicyJson)
    $smPolicy = aws iam create-policy --policy-name VertofiSecretsManagerPolicy --policy-document file://$smPolicyPath | ConvertFrom-Json
    $smPolicyArn = $smPolicy.Policy.Arn
    Remove-Item -Path $smPolicyPath -ErrorAction SilentlyContinue
}
Write-Host "Secrets Manager Policy ARN: $smPolicyArn"

# Create IRSA for External Secrets
Write-Host "Creating IRSA for External Secrets..."
eksctl create iamserviceaccount `
  --cluster=vertofi-production `
  --namespace=external-secrets `
  --name=external-secrets-sa `
  --attach-policy-arn=$smPolicyArn `
  --approve --override-existing-serviceaccounts

# Wait for External Secrets Operator to be fully ready and CRDs registered
Write-Host "Waiting 30 seconds for External Secrets Operator CRDs to register..."
Start-Sleep -Seconds 30

# Create ClusterSecretStore
Write-Host "Applying ClusterSecretStore..."
$secretStoreYaml = @"
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-south-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
"@
$secretStoreYaml | kubectl apply -f -

# ----------------------------------------------------
# 2. Install AWS Load Balancer Controller
# ----------------------------------------------------
Write-Host "Installing AWS Load Balancer Controller..."
# Create IAM policy for ALB controller if not exists
$albPolicyArn = aws iam list-policies --query "Policies[?PolicyName=='AWSLoadBalancerControllerIAMPolicy'].Arn" --output text
if (-not $albPolicyArn) {
    Write-Host "Downloading and creating AWSLoadBalancerControllerIAMPolicy..."
    $policyDocUrl = "https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.2/docs/install/iam_policy.json"
    $policyDoc = Invoke-WebRequest -Uri $policyDocUrl -UseBasicParsing
    $albPolicyPath = Join-Path $PSScriptRoot "alb-policy.json"
    [System.IO.File]::WriteAllText($albPolicyPath, $policyDoc.Content)
    $albPolicy = aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://$albPolicyPath | ConvertFrom-Json
    $albPolicyArn = $albPolicy.Policy.Arn
    Remove-Item -Path $albPolicyPath -ErrorAction SilentlyContinue
}
Write-Host "ALB Policy ARN: $albPolicyArn"

# Create IRSA service account for ALB controller
Write-Host "Creating IRSA for ALB Controller..."
eksctl create iamserviceaccount `
  --cluster=vertofi-production `
  --namespace=kube-system `
  --name=aws-load-balancer-controller `
  --role-name AmazonEKSLoadBalancerControllerRole `
  --attach-policy-arn=$albPolicyArn `
  --approve --override-existing-serviceaccounts

# Install via Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller `
  -n kube-system `
  --set clusterName=vertofi-production `
  --set serviceAccount.create=false `
  --set serviceAccount.name=aws-load-balancer-controller

# ----------------------------------------------------
# 3. Deploy All 32 Microservices
# ----------------------------------------------------
Write-Host "Deploying microservices..."
$ECR = "$accountId.dkr.ecr.ap-south-1.amazonaws.com"
$VERSION = "latest"

$servicesList = @(
  # name, port, namespace, replicas, nodeSelectorRole (optional)
  @("auth", 4001, "vertofi-identity", 3, ""),
  @("tenant", 4002, "vertofi-identity", 3, ""),
  @("access", 4003, "vertofi-identity", 3, ""),
  @("api-gateway", 4000, "vertofi-gateway", 5, ""),
  @("document", 4006, "vertofi-documents", 3, ""),
  @("ocr", 4008, "vertofi-documents", 2, "worker"),
  @("accounting-ledger", 4011, "vertofi-accounting", 3, ""),
  @("reconciliation", 4013, "vertofi-accounting", 3, ""),
  @("accounting-sync", 4017, "vertofi-accounting", 3, ""),
  @("accounting", 4031, "vertofi-accounting", 3, ""),
  @("bank-connector", 4015, "vertofi-connectors", 3, ""),
  @("gst-connector", 4016, "vertofi-connectors", 3, ""),
  @("vendor", 4023, "vertofi-connectors", 3, ""),
  @("verification-connectors", 4029, "vertofi-connectors", 3, ""),
  @("ai-gateway", 4010, "vertofi-intelligence", 2, "worker"),
  @("categorization", 4012, "vertofi-intelligence", 2, "worker"),
  @("bhs-engine", 4019, "vertofi-intelligence", 3, ""),
  @("prediction", 4021, "vertofi-intelligence", 3, ""),
  @("vbd", 4024, "vertofi-intelligence", 3, ""),
  @("bhs-intelligence", 4026, "vertofi-intelligence", 3, ""),
  @("benchmarks", 4027, "vertofi-intelligence", 3, ""),
  @("exception-workflow", 4014, "vertofi-workflow", 3, ""),
  @("onboarding", 4005, "vertofi-workflow", 3, ""),
  @("lifeguard", 4022, "vertofi-workflow", 3, ""),
  @("legal-cases", 4025, "vertofi-workflow", 3, ""),
  @("warranty", 4028, "vertofi-workflow", 3, ""),
  @("notification", 4009, "vertofi-engagement", 3, ""),
  @("whatsapp", 4018, "vertofi-engagement", 3, ""),
  @("reporting", 4020, "vertofi-engagement", 3, ""),
  @("billing", 4007, "vertofi-commerce", 3, ""),
  @("audit", 4004, "vertofi-commerce", 3, ""),
  @("admin-console", 4030, "vertofi-commerce", 3, "")
)

foreach ($s in $servicesList) {
    $name = $s[0]
    $port = $s[1]
    $ns = $s[2]
    $replicas = $s[3]
    $nodeRole = $s[4]

    Write-Host "Deploying service $name..."
    $replicas = 1  # Force scaled-down replicas to fit EKS CPU limits
    $cmd = "helm upgrade --install $name 'e:\VERTOFI APPLICATION\deploy\helm\vertofi-service' " +
           "--namespace $ns --create-namespace " +
           "--set name=$name " +
           "--set image.repository='$ECR/vertofi/$name' " +
           "--set image.tag=$VERSION " +
           "--set port=$port " +
           "--set replicaCount=$replicas " +
           "--set autoscaling.enabled=false " +
           "--set externalSecrets.remoteKeyPrefix='vertofi/production' " +
           "--set env.NODE_ENV=production " +
           "--set serviceMonitor.enabled=false"

    if ($nodeRole) {
        $cmd += " --set nodeSelector.role=$nodeRole"
    }

    # Add service specific env overrides
    if ($name -eq "auth") {
        $cmd += " --set env.JWT_ACCESS_TTL=900 --set env.JWT_REFRESH_TTL=2592000"
    }
    elseif ($name -eq "api-gateway") {
        $cmd += " --set autoscaling.minReplicas=5 --set autoscaling.maxReplicas=50"
        $cmd += " --set-string 'env.CORS_ORIGINS=https://vertofi.com\,https://app.vertofi.com\,https://panels.vertofi.com\,https://admin.vertofi.com'"
        $cmd += " --set 'env.NEXT_PUBLIC_API_URL=https://api.vertofi.com/api/v1'"
    }
    elseif ($name -eq "document") {
        $cmd += " --set 'env.S3_BUCKET=vertofi-documents-production' --set 'env.S3_REGION=ap-south-1'"
    }
    elseif ($name -eq "ocr") {
        $cmd += " --set 'env.AWS_TEXTRACT_REGION=ap-south-1'"
    }
    elseif ($name -eq "ai-gateway") {
        $cmd += " --set 'env.AI_USD_PER_1K_TOKENS=0.0006'"
    }
    elseif ($name -eq "notification") {
        $cmd += " --set 'env.AWS_SES_REGION=ap-south-1' --set 'env.AWS_SES_FROM=no-reply@vertofi.com'"
    }
    elseif ($name -eq "admin-console") {
        $cmd += " --set 'env.NEXT_PUBLIC_GRAFANA_URL=https://grafana.vertofi.internal'"
    }

    Invoke-Expression $cmd
}

# ----------------------------------------------------
# 4. Deploy 4 Frontend Apps
# ----------------------------------------------------
Write-Host "Deploying frontend apps..."
$appsList = @(
  # name, port, namespace, replicas
  @("web-landing", 3000, "vertofi-frontend", 3),
  @("web-business", 3001, "vertofi-frontend", 3),
  @("web-panels", 3002, "vertofi-frontend", 3),
  @("web-admin", 3003, "vertofi-frontend", 2)
)

foreach ($a in $appsList) {
    $name = $a[0]
    $port = $a[1]
    $ns = $a[2]
    $replicas = $a[3]

    Write-Host "Deploying frontend app $name..."
    $replicas = 1  # Force scaled-down replicas to fit EKS CPU limits
    $cmd = "helm upgrade --install $name 'e:\VERTOFI APPLICATION\deploy\helm\vertofi-service' " +
           "--namespace $ns --create-namespace " +
           "--set name=$name " +
           "--set image.repository='$ECR/vertofi/$name' " +
           "--set image.tag=$VERSION " +
           "--set port=$port " +
           "--set replicaCount=$replicas " +
           "--set autoscaling.enabled=false " +
           "--set externalSecrets.enabled=false " +
           "--set env.NODE_ENV=production " +
           "--set serviceMonitor.enabled=false"

    if ($name -eq "web-landing") {
        $cmd += " --set 'env.NEXT_PUBLIC_API_URL=https://api.vertofi.com/api/v1'"
        $cmd += " --set 'env.NEXT_PUBLIC_BUSINESS_URL=https://app.vertofi.com'"
        $cmd += " --set 'env.NEXT_PUBLIC_PANEL_BASE=https://panels.vertofi.com'"
    }
    elseif ($name -eq "web-business" -or $name -eq "web-panels") {
        $cmd += " --set 'env.NEXT_PUBLIC_API_URL=https://api.vertofi.com/api/v1'"
    }
    elseif ($name -eq "web-admin") {
        $cmd += " --set 'env.NEXT_PUBLIC_API_URL=https://api.vertofi.com/api/v1'"
        $cmd += " --set 'env.NEXT_PUBLIC_GRAFANA_URL=http://grafana.vertofi-observability:3000'"
    }

    Invoke-Expression $cmd
}

# ----------------------------------------------------
# 5. Apply Public ALB Ingress routing
# ----------------------------------------------------
Write-Host "Applying Ingress Routing..."
# Get ACM certificate ARN
$acmCertArn = aws acm list-certificates --region ap-south-1 --query "CertificateSummaryList[?DomainName=='vertofi.com'].CertificateArn" --output text
Write-Host "ACM Certificate ARN: $acmCertArn"

$ingressYaml = @"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vertofi-api-ingress
  namespace: vertofi-gateway
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: "$acmCertArn"
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/load-balancer-attributes: "idle_timeout.timeout_seconds=60"
    alb.ingress.kubernetes.io/group.name: vertofi-public
spec:
  rules:
    - host: api.vertofi.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 4000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vertofi-frontend-ingress
  namespace: vertofi-frontend
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: "$acmCertArn"
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/healthcheck-path: /
    alb.ingress.kubernetes.io/load-balancer-attributes: "idle_timeout.timeout_seconds=60"
    alb.ingress.kubernetes.io/group.name: vertofi-public
spec:
  rules:
    - host: vertofi.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-landing
                port:
                  number: 3000
    - host: app.vertofi.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-business
                port:
                  number: 3001
    - host: panels.vertofi.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-panels
                port:
                  number: 3002
"@
$ingressYaml | kubectl apply -f -
Write-Host "Ingresses successfully created with cross-namespace ALB grouping!"
