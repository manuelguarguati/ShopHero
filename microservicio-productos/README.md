# Microservicio de productos: Node.js + Docker + Kubernetes + Terraform + CI/CD

Solución al ejercicio "Ejemplos prácticos".

## Estructura

```
proyecto/
├── src/                      # Microservicio (app.js, server.js)
├── test/app.test.js          # Pruebas unitarias (Jest + Supertest)
├── Dockerfile
├── .dockerignore
├── package.json
├── k8s/                      # Manifiestos de Kubernetes
│   ├── deployment.yaml
│   └── service.yaml
├── terraform/                # Cluster Kubernetes (GKE) en la nube
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── .github/workflows/ci-cd.yml
```

## 1. Microservicio en local

```bash
npm install
npm test
npm start
curl http://localhost:3000/health
curl http://localhost:3000/api/productos
```

## 2. Docker

```bash
docker build -t microservicio-productos:latest .
docker run -p 3000:3000 microservicio-productos:latest
```

## 3. Despliegue en Kubernetes con minikube

```bash
minikube start
# Construir la imagen DENTRO del Docker de minikube
eval $(minikube docker-env)          # En Windows PowerShell: minikube docker-env | Invoke-Expression
docker build -t microservicio-productos:latest .

kubectl apply -f k8s/
kubectl get pods
minikube service microservicio-productos --url
```

Prueba la URL que devuelve el último comando, agregando `/health` o `/api/productos`.

## 4. Terraform: cluster Kubernetes en la nube (GKE)

Requisitos: cuenta de Google Cloud, `gcloud` y `terraform` instalados.

```bash
gcloud auth application-default login
cd terraform
terraform init
terraform plan  -var="project_id=TU_PROYECTO"
terraform apply -var="project_id=TU_PROYECTO"

# Conectar kubectl al cluster
$(terraform output -raw comando_kubeconfig)

# Al terminar, para no generar costos:
terraform destroy -var="project_id=TU_PROYECTO"
```

> Si prefieres AWS (EKS) o Azure (AKS), solo cambia el provider y los recursos de `main.tf`; la estructura es la misma.

## 5. Pipeline CI/CD (GitHub Actions)

El workflow `.github/workflows/ci-cd.yml` tiene dos jobs:

1. **build-and-test**: instala dependencias, ejecuta las pruebas unitarias y valida que la imagen Docker compile.
2. **deploy** (solo en `main`): construye y sube la imagen a Artifact Registry y la despliega en el cluster con `kubectl apply`.

Secrets necesarios en GitHub (Settings → Secrets and variables → Actions):

| Secret | Contenido |
|---|---|
| `GCP_PROJECT_ID` | ID del proyecto de GCP |
| `GCP_SA_KEY` | JSON de una cuenta de servicio con roles *Artifact Registry Writer* y *Kubernetes Engine Developer* |

## Arquitectura (según el diagrama de la diapositiva)

Usuarios → UI → API Gateway → Microservicios (cada uno con su base de datos) → Bus de eventos. Este proyecto implementa un microservicio de esa arquitectura; puedes replicar la carpeta para crear más servicios.
