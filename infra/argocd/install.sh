#!/bin/bash

# Argo CD Installation Script for AI Task Platform
# This script automates the complete Argo CD setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "${YELLOW}→${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    print_success "kubectl found"
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    print_success "Connected to Kubernetes cluster"
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "git not found. Please install git."
        exit 1
    fi
    print_success "git found"
}

# Step 1: Create namespace
create_namespace() {
    print_header "Step 1: Creating Argo CD Namespace"
    
    print_step "Creating namespace 'argocd'..."
    kubectl create namespace argocd 2>/dev/null || print_success "Namespace already exists"
    print_success "Namespace created/verified"
}

# Step 2: Install Argo CD
install_argocd() {
    print_header "Step 2: Installing Argo CD"
    
    print_step "Applying Argo CD manifests..."
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    print_success "Argo CD manifests applied"
}

# Step 3: Wait for Argo CD to be ready
wait_for_argocd() {
    print_header "Step 3: Waiting for Argo CD to be Ready"
    
    print_step "Waiting for pods to be ready (timeout: 300s)..."
    kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
    print_success "All Argo CD pods are ready"
}

# Step 4: Expose Argo CD server
expose_argocd() {
    print_header "Step 4: Exposing Argo CD Server"
    
    print_step "Patching argocd-server service to LoadBalancer..."
    kubectl patch svc argocd-server -n argocd -p '{"spec":{"type":"LoadBalancer"}}' 2>/dev/null || true
    print_success "Service patched"
    
    print_step "Waiting for LoadBalancer IP..."
    sleep 5
    
    # Try to get external IP
    EXTERNAL_IP=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [ -z "$EXTERNAL_IP" ]; then
        print_step "LoadBalancer IP not available (normal for local k3s)"
        print_step "Use port-forward instead:"
        echo -e "${BLUE}  kubectl port-forward svc/argocd-server -n argocd 8080:443${NC}"
        ARGOCD_URL="https://localhost:8080"
    else
        ARGOCD_URL="https://$EXTERNAL_IP"
        print_success "LoadBalancer IP: $EXTERNAL_IP"
    fi
}

# Step 5: Get initial admin password
get_admin_password() {
    print_header "Step 5: Getting Initial Admin Password"
    
    print_step "Retrieving admin password..."
    sleep 5
    
    ADMIN_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" 2>/dev/null | base64 -d || echo "")
    
    if [ -z "$ADMIN_PASSWORD" ]; then
        print_error "Could not retrieve admin password"
        print_step "Try manually:"
        echo -e "${BLUE}  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath \"{.data.password}\" | base64 -d${NC}"
    else
        print_success "Admin password retrieved"
        echo -e "${YELLOW}Password: ${ADMIN_PASSWORD}${NC}"
    fi
}

# Step 6: Create AppProject
create_appproject() {
    print_header "Step 6: Creating Argo CD AppProject"
    
    print_step "Applying AppProject manifest..."
    kubectl apply -f infra/argocd/project.yaml
    print_success "AppProject created"
}

# Step 7: Create Application
create_application() {
    print_header "Step 7: Creating Argo CD Application"
    
    print_step "Applying Application manifest..."
    kubectl apply -f infra/argocd/application.yaml
    print_success "Application created"
    
    print_step "Waiting for application to sync..."
    sleep 10
}

# Step 8: Verify deployment
verify_deployment() {
    print_header "Step 8: Verifying Deployment"
    
    print_step "Checking application status..."
    kubectl get application ai-task-platform -n argocd
    
    print_step "Checking deployed resources..."
    kubectl get all -n ai-task-platform
    
    print_step "Checking pod status..."
    kubectl get pods -n ai-task-platform
    
    print_success "Deployment verified"
}

# Main execution
main() {
    print_header "Argo CD Installation for AI Task Platform"
    
    check_prerequisites
    create_namespace
    install_argocd
    wait_for_argocd
    expose_argocd
    get_admin_password
    create_appproject
    create_application
    verify_deployment
    
    print_header "Installation Complete!"
    
    echo -e "${GREEN}✅ Argo CD is now installed and configured${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Access Argo CD Dashboard:"
    echo -e "   ${BLUE}kubectl port-forward svc/argocd-server -n argocd 8080:443${NC}"
    echo "   Then open: https://localhost:8080"
    echo ""
    echo "2. Login with:"
    echo "   Username: admin"
    echo "   Password: (see above)"
    echo ""
    echo "3. View application status:"
    echo -e "   ${BLUE}kubectl get application ai-task-platform -n argocd${NC}"
    echo ""
    echo "4. Watch sync progress:"
    echo -e "   ${BLUE}kubectl get application ai-task-platform -n argocd -w${NC}"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo "- Setup Guide: infra/argocd/SETUP.md"
    echo "- GitOps Workflow: infra/argocd/GITOPS_WORKFLOW.md"
    echo "- Dashboard Guide: infra/argocd/DASHBOARD_GUIDE.md"
    echo "- Repository Layout: infra/argocd/REPOSITORY_LAYOUT.md"
}

# Run main function
main
