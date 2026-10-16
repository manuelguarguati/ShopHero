variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "zone" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "node_count" {
  type = number
}

variable "machine_type" {
  type = string
}

resource "google_container_cluster" "primary" {
  name                     = var.cluster_name
  location                 = var.zone
  project                  = var.project_id
  remove_default_node_pool = true
  initial_node_count       = 1
  deletion_protection      = false
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.cluster_name}-nodes"
  location   = var.zone
  project    = var.project_id
  cluster    = google_container_cluster.primary.name
  node_count = var.node_count

  node_config {
    machine_type = var.machine_type
    disk_size_gb = 30
    labels       = { entorno = "demo" }
  }
}

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  project       = var.project_id
  repository_id = "shophero"
  format        = "DOCKER"
}

output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}
