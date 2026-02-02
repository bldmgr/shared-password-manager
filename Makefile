.PHONY: help install dev build lint typecheck clean docker-build docker-run helm-install helm-upgrade helm-uninstall k8s-deploy k8s-logs

# Variables
APP_NAME := password-manager
VERSION := 1.0.0
REGISTRY := your-registry
IMAGE := $(REGISTRY)/$(APP_NAME)
NAMESPACE := password-manager

help:
	@echo "Available commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make dev            - Start development server"
	@echo "  make build          - Build production bundle"
	@echo "  make lint           - Run ESLint"
	@echo "  make typecheck      - Run TypeScript type checking"
	@echo "  make clean          - Clean build artifacts"
	@echo ""
	@echo "Docker commands:"
	@echo "  make docker-build   - Build Docker image"
	@echo "  make docker-push    - Push Docker image to registry"
	@echo "  make docker-run     - Run Docker container locally"
	@echo ""
	@echo "Kubernetes/Helm commands:"
	@echo "  make helm-install   - Install with Helm"
	@echo "  make helm-upgrade   - Upgrade Helm release"
	@echo "  make helm-uninstall - Uninstall Helm release"
	@echo "  make k8s-logs       - View pod logs"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

typecheck:
	npm run typecheck

clean:
	rm -rf dist node_modules

docker-build:
	docker build -t $(IMAGE):$(VERSION) .
	docker tag $(IMAGE):$(VERSION) $(IMAGE):latest

docker-push:
	docker push $(IMAGE):$(VERSION)
	docker push $(IMAGE):latest

docker-run:
	docker run -d \
		--name $(APP_NAME) \
		-p 8080:80 \
		--env-file .env \
		$(IMAGE):$(VERSION)

helm-install:
	helm install $(APP_NAME) ./helm/$(APP_NAME) \
		-n $(NAMESPACE) \
		--create-namespace

helm-upgrade:
	helm upgrade $(APP_NAME) ./helm/$(APP_NAME) \
		-n $(NAMESPACE)

helm-uninstall:
	helm uninstall $(APP_NAME) -n $(NAMESPACE)

k8s-logs:
	kubectl logs -n $(NAMESPACE) -l app.kubernetes.io/name=$(APP_NAME) -f

k8s-status:
	kubectl get all -n $(NAMESPACE)

k8s-describe:
	kubectl describe deployment $(APP_NAME) -n $(NAMESPACE)
