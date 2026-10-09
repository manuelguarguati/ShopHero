variable "project_id" {
  description = "ID del proyecto de Google Cloud"
  type        = string
}

variable "region" {
  description = "Región de GCP"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zona del cluster (zonal = más barato que regional)"
  type        = string
  default     = "us-central1-a"
}

variable "cluster_name" {
  description = "Nombre del cluster de Kubernetes"
  type        = string
  default     = "cluster-microservicios"
}

variable "node_count" {
  description = "Cantidad de nodos"
  type        = number
  default     = 2
}

variable "machine_type" {
  description = "Tipo de máquina de los nodos"
  type        = string
  default     = "e2-medium"
}
