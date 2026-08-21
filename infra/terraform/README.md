# Vertofi Infrastructure (Terraform)

Production infrastructure as code (docs/14, docs/21). Primary region **AWS Mumbai (ap-south-1)** for Indian data residency.

## Layout
```
infra/terraform/
  versions.tf      provider + remote-state backend
  variables.tf     region, env, CIDRs, DB sizing
  main.tf          composes modules
  modules/
    network/       VPC, public/private subnets, NAT, route tables (multi-AZ)
    aurora/        Aurora PostgreSQL cluster (writer + read replicas), encrypted, PITR
```
EKS, ElastiCache (Redis), MSK (Kafka), OpenSearch, S3 + CloudFront/WAF, Secrets Manager, IAM and observability follow the same module pattern and are added incrementally.

## Usage
```bash
cd infra/terraform
terraform init
terraform plan  -var env=production
terraform apply -var env=production
```

## Conventions
- Remote state in S3 + DynamoDB lock (uncomment the backend block once the state bucket exists).
- No manual infra changes — everything via Terraform PRs (validated by `.github/workflows/security.yml`).
- Per-env via `-var env=` or workspaces. Default tags applied to every resource.

## DR
Cross-region Aurora replica + S3 cross-region replication + Kafka MirrorMaker are enabled for the DR region. Promotion + failover steps are in [`../../docs/21-disaster-recovery.md`](../../docs/21-disaster-recovery.md).
