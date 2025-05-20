# Cloud-Native Application Monitoring and Visibility Report

## Introduction

This report documents the implementation of a cloud-native application with monitoring and visibility capabilities using Google Cloud Platform (GCP) tools. The project involved containerizing a Node.js application, deploying it to Kubernetes, and implementing comprehensive monitoring solutions to track its performance and health.

## Deployment Process

### Application Architecture

The application was built using the following components:

1. **Backend**: Node.js with Express.js framework
2. **Database**: MongoDB for data storage
3. **Monitoring**: Prometheus metrics for application-level monitoring
4. **Logging**: Winston logger for structured logging
5. **Containerization**: Docker for packaging the application
6. **Orchestration**: Kubernetes for deployment and management
7. **Cloud Platform**: Google Cloud Platform (GCP)

The application exposes several REST API endpoints and includes built-in monitoring capabilities through Prometheus metrics and structured logging.

### Step 1: Application Development

I developed a Node.js application with the following features:

- RESTful API endpoints for task management
- MongoDB integration for data persistence
- Health check endpoint for Kubernetes probes
- Prometheus metrics endpoint for monitoring
- Structured logging with Winston

The application was designed with monitoring in mind from the beginning, with custom metrics for:
- HTTP request counts and durations
- Memory usage tracking
- CPU usage monitoring
- Database operation metrics

### Step 2: Containerization

I containerized the application using Docker:

1. Created a `Dockerfile` with the following configuration:
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. Built the Docker image:
   ```bash
   docker build -t cloud-app:latest .
   ```

3. Tested the container locally:
   ```bash
   docker run -p 3000:3000 cloud-app:latest
   ```

### Step 3: Kubernetes Configuration

I created Kubernetes manifest files for deployment:

1. **Namespace** (`namespace.yaml`): Isolated environment for the application
2. **Deployment** (`deployment.yaml`): Configured the application deployment with:
   - Resource requests and limits
   - Health probes
   - Replica count
   - Container image and port
   - Environment variables
3. **Service** (`service.yaml`): Exposed the application
4. **MongoDB** (`mongo.yaml`): Deployed MongoDB with persistent storage

The deployment configuration included annotations for Prometheus metrics scraping:
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/path: "/metrics"
  prometheus.io/port: "3000"
```

### Step 4: Deployment Strategy

Initially, I planned to deploy to Google Kubernetes Engine (GKE), but due to permission limitations in my university-managed GCP account, I explored alternative approaches:

1. First attempt: Google Cloud Run with DockerHub
   - Built images with platform compatibility (`--platform=linux/amd64`)
   - Pushed to DockerHub (username: masonnia)
   - Deployed to Cloud Run

2. Second approach: Local Kubernetes deployment
   - Deployed to local Kubernetes cluster
   - Used port-forwarding to access the application
   - Implemented monitoring with `kubectl top` commands

### Step 5: Deployment Execution

For the final deployment, I created a deployment script (`deploy.sh`) that:
1. Checks if Docker and Kubernetes are running
2. Builds the Docker image
3. Applies Kubernetes configurations
4. Waits for deployment to complete
5. Provides instructions for accessing and monitoring the application

## Monitoring and Visibility Implementation

### Resource Monitoring

I implemented resource monitoring using Kubernetes built-in tools:

1. **Pod Resource Monitoring**:
   ```bash
   kubectl top pods -n cloud-app
   ```
   This command shows CPU and memory usage for each pod.

2. **Node Resource Monitoring**:
   ```bash
   kubectl top nodes
   ```
   This command displays CPU and memory usage for each Kubernetes node.

### Application Metrics

I implemented application-level metrics using Prometheus:

1. **Custom Metrics**:
   - HTTP request duration: `http_request_duration_seconds`
   - HTTP request count: `http_requests_total`
   - Memory usage: `nodejs_memory_usage_bytes`
   - CPU usage: `nodejs_cpu_usage_seconds_total`
   - Active connections: `nodejs_active_connections`
   - MongoDB operations: `mongodb_operations_total`

2. **Metrics Endpoint**:
   The application exposes metrics at the `/metrics` endpoint, which can be accessed via port-forwarding:
   ```bash
   kubectl port-forward service/cloud-app-service -n cloud-app 3000:80
   curl http://localhost:3000/metrics
   ```

### Logging

I implemented structured logging with Winston:

1. **Log Format**: JSON format with standardized fields
2. **Log Levels**: Different severity levels (INFO, ERROR)
3. **Context Enrichment**: Logs include contextual information such as:
   - HTTP request details (method, path, status code, duration)
   - MongoDB operation details (operation type, collection, duration)
   - Error details including stack traces

4. **Accessing Logs**:
   ```bash
   kubectl logs -n cloud-app deployment/cloud-app
   ```

### Google Cloud Monitoring Integration

For the Cloud Run deployment, I integrated with Google Cloud Monitoring:

1. **Structured Logging**: Configured Winston to output logs in a format compatible with Google Cloud Logging
2. **Custom Metrics**: Implemented metrics that can be viewed in Google Cloud Monitoring
3. **Resource Monitoring**: Utilized Google Cloud Monitoring for resource usage tracking

## Challenges and Solutions

### Challenge 1: GCP Permission Limitations

**Issue**: As a university student, I had limited permissions in my GCP project (`sit737-25t1-behbahani-2aa0d06`). I encountered errors when trying to:
- Push to Google Container Registry
- Set IAM policies for Cloud Run
- Create GKE clusters

**Solution**:
1. Used DockerHub instead of Google Container Registry for image hosting
2. Implemented a hybrid approach:
   - Used Cloud Run for serverless deployment
   - Used local Kubernetes for development and testing
3. Documented both approaches to demonstrate understanding

### Challenge 2: Cross-Platform Compatibility

**Issue**: When building Docker images on macOS for deployment to Cloud Run, I encountered architecture compatibility issues:
```
ERROR: Cloud Run does not support image 'docker.io/masonnia/cloud-app:latest': Container manifest type 'application/vnd.oci.image.index.v1+json' must support amd64/linux.
```

**Solution**:
1. Added platform-specific flags to the Dockerfile:
   ```dockerfile
   FROM --platform=linux/amd64 node:16-alpine
   ```
2. Used platform flag during build:
   ```bash
   docker build --platform linux/amd64 -t ${IMAGE_NAME} .
   ```

### Challenge 3: Metrics Server for kubectl top

**Issue**: Initially, `kubectl top` commands failed with "Metrics API not available" error.

**Solution**:
1. Installed Metrics Server in the Kubernetes cluster:
   ```bash
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```
2. Modified the Metrics Server deployment to skip TLS verification for local development

### Challenge 4: MongoDB Connectivity

**Issue**: For Cloud Run deployment, connecting to MongoDB was challenging since Cloud Run is serverless and can't directly connect to containers.

**Solution**:
1. For Cloud Run: Recommended MongoDB Atlas as a cloud database solution
2. For Kubernetes: Deployed MongoDB in the same cluster with persistent storage

## Conclusion

This project successfully demonstrated the implementation of monitoring and visibility for a cloud-native application. By leveraging Kubernetes, Prometheus metrics, and structured logging, I was able to gain comprehensive insights into the application's performance and health.

The implementation showcases:
1. Resource monitoring with `kubectl top`
2. Application metrics with Prometheus
3. Structured logging with Winston
4. Deployment automation with scripts and Kubernetes manifests

Despite facing challenges with GCP permissions and cross-platform compatibility, I was able to adapt my approach and implement effective solutions. This experience has provided valuable insights into the complexities of cloud-native application deployment and monitoring.

## Future Improvements

1. Implement Prometheus and Grafana for more advanced monitoring
2. Set up alerting based on metrics thresholds
3. Implement distributed tracing for request tracking
4. Create custom dashboards for visualization
5. Implement automated scaling based on metrics

## References

1. Kubernetes Documentation: https://kubernetes.io/docs/
2. Prometheus Documentation: https://prometheus.io/docs/
3. Google Cloud Documentation: https://cloud.google.com/docs
4. Node.js Documentation: https://nodejs.org/en/docs/
5. Docker Documentation: https://docs.docker.com/
