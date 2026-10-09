terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cluster Kubernetes administrado (GKE)
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.zone

  # Se elimina el node pool por defecto y se usa uno propio
  remove_default_node_pool = true
  initial_node_count       = 1

  deletion_protection = false
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.cluster_name}-nodos"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = var.node_count

  node_config {
    machine_type = var.machine_type
    disk_size_gb = 30

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    labels = {
      entorno = "demo"
    }
  }
}

# Registro de imágenes Docker
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "microservicios"
  format        = "DOCKER"
}
