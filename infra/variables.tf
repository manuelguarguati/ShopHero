variable "project_id" {
  description = "ID del proyecto de Google Cloud, suministrado fuera del código."
  type        = string
}

variable "region" {
  description = "Región para los recursos de ShopHero."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zona del clúster de Kubernetes."
  type        = string
  default     = "us-central1-a"
}

variable "cluster_name" {
  description = "Nombre del clúster."
  type        = string
  default     = "shophero"
}

variable "node_count" {
  description = "Cantidad de nodos del pool inicial."
  type        = number
  default     = 2
}

variable "machine_type" {
  description = "Tipo de máquina del pool."
  type        = string
  default     = "e2-medium"
}
