# Deployment Guide

This guide provides detailed instructions for deploying the Password Manager application to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Production Considerations](#production-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)

## Prerequisites

### For All Deployments

- Supabase account and project
- Git
- Node.js 18+ (for local development)

### For Docker Deployments

- Docker 20.10+
- Docker Compose (optional)

### For Kubernetes Deployments

- Kubernetes cluster (1.19+)
- kubectl configured to access your cluster
- Helm 3.x
- Container registry (Docker Hub, GCR, ECR, etc.)

## Local Development

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd password-manager

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Detailed Setup

1. **Create Supabase Project**
   ```
   - Visit https://supabase.com
   - Create a new project
   - Note your Project URL and anon key
   ```

2. **Apply Database Migrations**
   ```bash
   # Using Supabase CLI
   supabase link --project-ref <your-project-ref>
   supabase db push

   # Or manually via SQL Editor in Supabase Dashboard
   ```

3. **Configure Environment**
   ```bash
   echo "VITE_SUPABASE_URL=https://your-project.supabase.co" > .env
   echo "VITE_SUPABASE_ANON_KEY=your-anon-key" >> .env
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Create First Admin User**
   ```sql
   -- In Supabase SQL Editor
   UPDATE user_profiles
   SET is_admin = true
   WHERE email = 'your-email@example.com';
   ```

## Docker Deployment

### Build Image

```bash
# Build the image
docker build -t password-manager:1.0.0 .

# Tag for your registry
docker tag password-manager:1.0.0 your-registry/password-manager:1.0.0

# Push to registry
docker push your-registry/password-manager:1.0.0
```

### Run Locally with Docker

```bash
docker run -d \
  --name password-manager \
  -p 8080:80 \
  -e VITE_SUPABASE_URL=https://your-project.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  password-manager:1.0.0
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  password-manager:
    build: .
    ports:
      - "8080:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

## Kubernetes Deployment

### Step 1: Build and Push Image

```bash
# Build
docker build -t your-registry/password-manager:1.0.0 .

# Push
docker push your-registry/password-manager:1.0.0
```

### Step 2: Create Namespace (Optional)

```bash
kubectl create namespace password-manager
```

### Step 3: Create Secrets

**Option A: Using kubectl**

```bash
kubectl create secret generic password-manager-secrets \
  --from-literal=VITE_SUPABASE_URL=https://your-project.supabase.co \
  --from-literal=VITE_SUPABASE_ANON_KEY=your-anon-key \
  -n password-manager
```

**Option B: Using YAML**

```bash
# Copy and edit the example
cp kubernetes/secrets.example.yaml kubernetes/secrets.yaml
# Edit with your values
kubectl apply -f kubernetes/secrets.yaml -n password-manager
```

### Step 4: Configure Helm Values

Edit `helm/password-manager/values.yaml`:

```yaml
image:
  repository: your-registry/password-manager
  tag: "1.0.0"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: passwords.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: password-manager-tls
      hosts:
        - passwords.yourdomain.com

envSecret:
  enabled: true
  secretName: password-manager-secrets

# Adjust resources based on your needs
resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

# Configure autoscaling
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

### Step 5: Install with Helm

```bash
# Install
helm install password-manager ./helm/password-manager \
  -n password-manager \
  --create-namespace

# Check status
helm status password-manager -n password-manager

# Watch pods
kubectl get pods -n password-manager -w
```

### Step 6: Verify Deployment

```bash
# Check all resources
kubectl get all -n password-manager

# Check ingress
kubectl get ingress -n password-manager

# Check logs
kubectl logs -n password-manager -l app.kubernetes.io/name=password-manager

# Port forward for testing
kubectl port-forward -n password-manager svc/password-manager 8080:80
```

### Step 7: Access Application

- **Via Ingress**: https://passwords.yourdomain.com
- **Via Port Forward**: http://localhost:8080

## Helm Chart Configuration

### Common Configurations

**Custom Resource Limits**

```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

**Disable Autoscaling**

```yaml
autoscaling:
  enabled: false

replicaCount: 3
```

**Custom Ingress Annotations**

```yaml
ingress:
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
```

**Node Affinity**

```yaml
nodeSelector:
  node.kubernetes.io/instance-type: t3.medium

affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: workload-type
          operator: In
          values:
          - frontend
```

## Production Considerations

### Security

1. **Use Secrets Management**
   - Use external secrets operator
   - Consider HashiCorp Vault or AWS Secrets Manager
   - Never commit secrets to git

2. **Enable Network Policies**
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: password-manager-netpol
   spec:
     podSelector:
       matchLabels:
         app.kubernetes.io/name: password-manager
     policyTypes:
     - Ingress
     ingress:
     - from:
       - namespaceSelector:
           matchLabels:
             name: ingress-nginx
   ```

3. **Enable Pod Security**
   ```yaml
   podSecurityContext:
     runAsNonRoot: true
     runAsUser: 101
     fsGroup: 101
     seccompProfile:
       type: RuntimeDefault
   ```

### TLS/SSL

1. **Install cert-manager**
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

2. **Create ClusterIssuer**
   ```yaml
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
     name: letsencrypt-prod
   spec:
     acme:
       server: https://acme-v02.api.letsencrypt.org/directory
       email: your-email@example.com
       privateKeySecretRef:
         name: letsencrypt-prod
       solvers:
       - http01:
           ingress:
             class: nginx
   ```

### High Availability

1. **Multiple Replicas**
   ```yaml
   replicaCount: 3

   affinity:
     podAntiAffinity:
       requiredDuringSchedulingIgnoredDuringExecution:
       - labelSelector:
           matchExpressions:
           - key: app.kubernetes.io/name
             operator: In
             values:
             - password-manager
         topologyKey: kubernetes.io/hostname
   ```

2. **Pod Disruption Budget**
   ```yaml
   apiVersion: policy/v1
   kind: PodDisruptionBudget
   metadata:
     name: password-manager-pdb
   spec:
     minAvailable: 1
     selector:
       matchLabels:
         app.kubernetes.io/name: password-manager
   ```

### Resource Optimization

1. **Horizontal Pod Autoscaling**
   - Already configured in Helm chart
   - Monitors CPU and memory utilization
   - Scales between min and max replicas

2. **Vertical Pod Autoscaling** (optional)
   ```yaml
   apiVersion: autoscaling.k8s.io/v1
   kind: VerticalPodAutoscaler
   metadata:
     name: password-manager-vpa
   spec:
     targetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: password-manager
     updatePolicy:
       updateMode: "Auto"
   ```

## Monitoring and Logging

### Prometheus Metrics

Add ServiceMonitor for Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: password-manager
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: password-manager
  endpoints:
  - port: http
    path: /metrics
```

### Logging

**EFK Stack (Elasticsearch, Fluentd, Kibana)**

```yaml
annotations:
  fluentd.io/parser: nginx
```

**Loki/Grafana**

Logs are automatically collected from stdout/stderr.

### Health Checks

Already configured in deployment:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Backup and Recovery

### Database Backups

Supabase handles database backups automatically:
- Point-in-time recovery available
- Daily automated backups
- Manual backups via Supabase dashboard

### Application State

Application is stateless - all state stored in:
1. Supabase database (automatically backed up)
2. Browser localStorage (encryption keys - user-specific)

### Disaster Recovery

1. **Restore Database**
   - Use Supabase's point-in-time recovery
   - Or restore from manual backup

2. **Redeploy Application**
   ```bash
   helm upgrade password-manager ./helm/password-manager \
     -n password-manager \
     --recreate-pods
   ```

## Upgrading

### Application Updates

```bash
# Build new version
docker build -t your-registry/password-manager:1.1.0 .
docker push your-registry/password-manager:1.1.0

# Update Helm values
# Edit helm/password-manager/values.yaml
# Change image.tag to "1.1.0"

# Upgrade
helm upgrade password-manager ./helm/password-manager \
  -n password-manager
```

### Database Migrations

```bash
# Apply new migrations
supabase db push

# Or via SQL Editor in Supabase Dashboard
```

### Rollback

```bash
# Helm rollback
helm rollback password-manager -n password-manager

# Or to specific revision
helm rollback password-manager 2 -n password-manager
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n password-manager

# Check logs
kubectl logs <pod-name> -n password-manager

# Check events
kubectl get events -n password-manager --sort-by='.lastTimestamp'
```

### Ingress Not Working

```bash
# Check ingress
kubectl describe ingress password-manager -n password-manager

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Test service directly
kubectl port-forward svc/password-manager 8080:80 -n password-manager
```

### Database Connection Issues

1. Verify secrets are correct
2. Check Supabase project status
3. Verify network connectivity
4. Check RLS policies

### High Memory/CPU Usage

```bash
# Check resource usage
kubectl top pods -n password-manager

# Adjust resources in values.yaml
# Then upgrade
helm upgrade password-manager ./helm/password-manager -n password-manager
```

## Support

For deployment issues:
1. Check application logs
2. Review Kubernetes events
3. Verify Supabase connectivity
4. Check ingress configuration
5. Review security policies and RBAC
