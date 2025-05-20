# Deployment script for Cloud Native Monitoring App using Kubernetes
IMAGE_NAME=cloud-app:latest

docker build -t ${IMAGE_NAME} .

#Deploying to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

kubectl rollout status deployment/cloud-app -n cloud-app

