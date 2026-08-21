# Refresh PATH to pick up newly installed tools (winget/terraform/eksctl/etc)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Wait for terraform apply to complete
Write-Host "Waiting for Terraform apply to finish..."
cd "e:\VERTOFI APPLICATION\infra\terraform"
while ($true) {
    $vpcId = terraform output -raw vpc_id 2>$null
    if ($vpcId -and $vpcId -like "vpc-*") {
        Write-Host "Terraform apply completed! VPC ID: $vpcId"
        break
    }
    Start-Sleep -Seconds 15
}

# Fetch subnets
Write-Host "Fetching subnets for VPC $vpcId..."
$subnetsJson = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[*].{Id:SubnetId,Az:AvailabilityZone,Name:Tags[?Key=='Name'].Value|[0]}" --output json --region ap-south-1
$subnets = $subnetsJson | ConvertFrom-Json

$private_1a = ($subnets | Where-Object { $_.Name -like "*private-0" }).Id
$private_1b = ($subnets | Where-Object { $_.Name -like "*private-1" }).Id
$private_1c = ($subnets | Where-Object { $_.Name -like "*private-2" }).Id

$public_1a = ($subnets | Where-Object { $_.Name -like "*public-0" }).Id
$public_1b = ($subnets | Where-Object { $_.Name -like "*public-1" }).Id
$public_1c = ($subnets | Where-Object { $_.Name -like "*public-2" }).Id

Write-Host "Private Subnets: 1a=$private_1a, 1b=$private_1b, 1c=$private_1c"
Write-Host "Public Subnets: 1a=$public_1a, 1b=$public_1b, 1c=$public_1c"

# Read original eks-cluster.yaml template
$eksYamlPath = "e:\VERTOFI APPLICATION\infra\eks-cluster.yaml"
$eksTemplatePath = "e:\VERTOFI APPLICATION\infra\eks-cluster-template.yaml"

# Write the template file
$templateContent = @"
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: vertofi-production
  region: ap-south-1
  version: "1.30"
  tags:
    Project: vertofi
    ManagedBy: eksctl
    Env: production

vpc:
  id: <VPC_ID>
  subnets:
    private:
      ap-south-1a: { id: <PRIVATE_SUBNET_1A> }
      ap-south-1b: { id: <PRIVATE_SUBNET_1B> }
      ap-south-1c: { id: <PRIVATE_SUBNET_1C> }
    public:
      ap-south-1a: { id: <PUBLIC_SUBNET_1A> }
      ap-south-1b: { id: <PUBLIC_SUBNET_1B> }
      ap-south-1c: { id: <PUBLIC_SUBNET_1C> }

iam:
  withOIDC: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver

managedNodeGroups:
  - name: general
    instanceType: m6i.large
    minSize: 3
    maxSize: 6
    desiredCapacity: 3
    privateNetworking: true
    labels:
      role: general
    tags:
      Project: vertofi
    amiFamily: AmazonLinux2023
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
        - arn:aws:iam::aws:policy/AmazonS3FullAccess
        - arn:aws:iam::aws:policy/AmazonTextractFullAccess
        - arn:aws:iam::aws:policy/SecretsManagerReadWrite
        - arn:aws:iam::aws:policy/AmazonSNSFullAccess
        - arn:aws:iam::aws:policy/AmazonSESFullAccess

  - name: workers
    instanceType: c6i.xlarge
    minSize: 2
    maxSize: 4
    desiredCapacity: 2
    privateNetworking: true
    labels:
      role: worker
    taints:
      - key: workload
        value: heavy
        effect: NoSchedule
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::aws:policy/AmazonTextractFullAccess
        - arn:aws:iam::aws:policy/SecretsManagerReadWrite
"@
$templateContent | Out-File -FilePath $eksTemplatePath -Encoding utf8

# Read template, replace placeholders, write to eks-cluster.yaml
$content = Get-Content $eksTemplatePath -Raw
$content = $content.Replace("<VPC_ID>", $vpcId)
$content = $content.Replace("<PRIVATE_SUBNET_1A>", $private_1a)
$content = $content.Replace("<PRIVATE_SUBNET_1B>", $private_1b)
$content = $content.Replace("<PRIVATE_SUBNET_1C>", $private_1c)
$content = $content.Replace("<PUBLIC_SUBNET_1A>", $public_1a)
$content = $content.Replace("<PUBLIC_SUBNET_1B>", $public_1b)
$content = $content.Replace("<PUBLIC_SUBNET_1C>", $public_1c)

$content | Out-File -FilePath $eksYamlPath -Encoding utf8
Write-Host "Updated eks-cluster.yaml successfully!"

# Create the EKS cluster or nodegroups
Write-Host "Checking EKS cluster status..."
$clusterExists = eksctl get cluster --name vertofi-production --region ap-south-1 2>$null
if ($clusterExists -and $clusterExists.Contains("vertofi-production")) {
    Write-Host "EKS Cluster already exists! Creating nodegroups only..."
    eksctl create nodegroup -f $eksYamlPath
} else {
    Write-Host "EKS Cluster does not exist! Creating EKS cluster and nodegroups (this takes 20-30 minutes)..."
    eksctl create cluster -f $eksYamlPath
}
