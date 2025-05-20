# Cloud Native Monitoring Application

This project demonstrates a cloud-native application with monitoring capabilities deployed on Kubernetes with resource usage monitoring via kubectl.

## Architecture

- **Node.js Express Application**: A simple REST API with MongoDB backend
- **Prometheus Metrics**: Built-in metrics collection for monitoring
- **Winston Logger**: For structured logging
- **Docker**: For containerization
- **Kubernetes**: For orchestration and deployment
- **MongoDB**: For database storage
- **kubectl top**: For resource monitoring

## Prerequisites

- Node.js
- Docker and Docker Compose
- kubectl
- Google Cloud SDK (gcloud)
- Access to a GCP project

## Local Development

1. Clone the repository
2. Run the application with Docker Compose:

```bash
docker-compose up
```

The application will be available at http://localhost:3000

## Deploying to Kubernetes

### 1. Build the Docker Image

```bash
# Build the Docker image
docker build -t cloud-app:latest .
```

### 2. Deploy to Kubernetes

```bash
# Apply Kubernetes configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Check deployment status
kubectl rollout status deployment/cloud-app -n cloud-app
```

### 3. Automated Deployment

Alternatively, use the provided deployment script:

```bash
# Run the deployment script
./deploy.sh
```

### 4. Accessing the Application

Set up port forwarding to access the application:

```bash
kubectl port-forward service/cloud-app-service -n cloud-app 3000:80
```

Then visit http://localhost:3000 in your browser.

## Monitoring with kubectl

The application can be monitored using Kubernetes built-in resource monitoring via kubectl commands.

### Resource Monitoring

#### Pod Resource Usage

To monitor CPU and memory usage of your pods:

```bash
kubectl top pods -n cloud-app
```

This command shows:
- CPU usage in millicores (m)
- Memory usage in MiB

Example output:
```
NAME                        CPU(cores)   MEMORY(bytes)   
cloud-app-68dfcb4dc-8f9xv   10m          111Mi           
cloud-app-68dfcb4dc-mswnt   11m          102Mi           
mongo-57fbf958bc-wrgv2      4m           106Mi
```

#### Node Resource Usage

To monitor CPU and memory usage of your Kubernetes nodes:

```bash
kubectl top nodes
```

This command shows:
- CPU usage in millicores and percentage
- Memory usage in MiB and percentage

Example output:
```
NAME             CPU(cores)   CPU(%)   MEMORY(bytes)   MEMORY(%)   
docker-desktop   520m         4%       3749Mi          48%
```

### Application Metrics

The application also exposes Prometheus metrics at the `/metrics` endpoint, which can be accessed via port forwarding:

```bash
kubectl port-forward service/cloud-app-service -n cloud-app 3000:80
curl http://localhost:3000/metrics
```

This provides detailed metrics including:
- HTTP request counts and durations
- Memory usage
- CPU usage
- MongoDB operation statistics

### Logs

To view application logs:

```bash
kubectl logs -n cloud-app deployment/cloud-app
```

For MongoDB logs:

```bash
kubectl logs -n cloud-app deployment/mongo
```

## API Endpoints

- `GET /`: Welcome message
- `GET /health`: Health check endpoint
- `GET /metrics`: Prometheus metrics
- `GET /api/tasks`: Get all tasks
- `POST /api/tasks`: Create a new task
