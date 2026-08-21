variable "env" { type = string }
variable "subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "instance_class" { type = string }
variable "replica_count" { type = number }
variable "allowed_cidr_block" { type = string }

resource "aws_db_subnet_group" "this" {
  name       = "vertofi-${var.env}"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "db" {
  name   = "vertofi-${var.env}-db"
  vpc_id = var.vpc_id
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr_block]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Multi-AZ Aurora PostgreSQL: 1 writer + N readers, encrypted, PITR, deletion
# protection (docs/14, docs/18).
resource "aws_rds_cluster" "this" {
  cluster_identifier              = "vertofi-${var.env}"
  engine                          = "aurora-postgresql"
  engine_version                  = "16.4"
  database_name                   = "vertofi"
  master_username                 = "vertofi"
  manage_master_user_password     = true
  db_subnet_group_name            = aws_db_subnet_group.this.name
  vpc_security_group_ids          = [aws_security_group.db.id]
  storage_encrypted               = true
  backup_retention_period         = 14
  preferred_backup_window         = "18:00-19:00"
  deletion_protection             = true
  copy_tags_to_snapshot           = true
  enabled_cloudwatch_logs_exports = ["postgresql"]
  skip_final_snapshot             = false
  final_snapshot_identifier       = "vertofi-${var.env}-final"
}

resource "aws_rds_cluster_instance" "writer" {
  identifier         = "vertofi-${var.env}-writer"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
}

resource "aws_rds_cluster_instance" "reader" {
  count              = var.replica_count
  identifier         = "vertofi-${var.env}-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
}

output "writer_endpoint" { value = aws_rds_cluster.this.endpoint }
output "reader_endpoint" { value = aws_rds_cluster.this.reader_endpoint }
