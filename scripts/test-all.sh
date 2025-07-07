#!/usr/bin/env bash

# Unified test runner for typesense-react
# This script manages the Typesense container and runs all tests

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.test.yml}"
CONTAINER_NAME="typesense-react-test"
MAX_WAIT_TIME=30

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to wait for Typesense to be ready
wait_for_typesense() {
    local count=0
    print_status "Waiting for Typesense to be ready..."
    
    while [ $count -lt $MAX_WAIT_TIME ]; do
        if curl -f http://localhost:8109/health > /dev/null 2>&1; then
            print_status "Typesense is ready!"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        printf "."
    done
    
    print_error "Typesense failed to start within $MAX_WAIT_TIME seconds"
    return 1
}

# Function to clean up containers and volumes
cleanup() {
    print_status "Cleaning up..."
    docker compose -f $COMPOSE_FILE down -v > /dev/null 2>&1 || true
    
    # Remove any orphaned containers
    docker rm -f $CONTAINER_NAME > /dev/null 2>&1 || true
}

# Function to run tests
run_tests() {
    print_status "Running all tests (unit + integration)..."
    
    # Export environment variables for tests
    export TYPESENSE_HOST=localhost
    export TYPESENSE_PORT=8109
    export TYPESENSE_PROTOCOL=http
    export TYPESENSE_API_KEY=xyz
    
    # Remove the exclude for integration tests temporarily
    cp vitest.config.ts vitest.config.ts.bak
    sed -i 's/src\/test\/integration\/\*\*\/\*\.test\.\*//' vitest.config.ts
    sed -i 's/src\/test\/integration\/\*\*\/\*\.spec\.\*//' vitest.config.ts
    
    # Run all tests
    local test_exit_code=0
    pnpm vitest run || test_exit_code=$?
    
    # Restore config
    mv vitest.config.ts.bak vitest.config.ts
    
    if [ $test_exit_code -eq 0 ]; then
        print_status "All tests completed successfully!"
        return 0
    else
        print_error "Some tests failed!"
        return $test_exit_code
    fi
}

# Main execution
main() {
    print_status "Starting complete test suite..."
    
    # Check Docker is available
    check_docker
    
    # Clean up any existing containers
    cleanup
    
    # Start Typesense container
    print_status "Starting Typesense container..."
    if ! docker compose -f $COMPOSE_FILE up -d; then
        print_error "Failed to start Typesense container"
        exit 1
    fi
    
    # Wait for Typesense to be ready
    if ! wait_for_typesense; then
        cleanup
        exit 1
    fi
    
    # Run tests
    local test_exit_code=0
    run_tests || test_exit_code=$?
    
    # Clean up
    cleanup
    
    # Exit with test exit code
    exit $test_exit_code
}

# Run main function
main