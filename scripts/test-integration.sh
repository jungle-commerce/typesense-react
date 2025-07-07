#!/usr/bin/env bash

# Integration test runner for typesense-react
# This script manages the Typesense container and runs integration tests

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
TEST_COMMAND="${TEST_COMMAND:-npm run test:integration}"

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
        if docker exec $CONTAINER_NAME curl -f http://localhost:8108/health > /dev/null 2>&1; then
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
    print_status "Running integration tests..."
    
    # Export environment variables for tests
    export TYPESENSE_HOST=localhost
    export TYPESENSE_PORT=8109
    export TYPESENSE_PROTOCOL=http
    export TYPESENSE_API_KEY=test_api_key
    
    # Run the test command
    if $TEST_COMMAND; then
        print_status "Tests completed successfully!"
        return 0
    else
        print_error "Tests failed!"
        return 1
    fi
}

# Main execution
main() {
    print_status "Starting integration test suite..."
    
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

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --keep         Keep containers running after tests"
        echo "  --no-cleanup   Don't clean up before starting"
        echo ""
        echo "Environment variables:"
        echo "  COMPOSE_FILE   Docker Compose file to use (default: docker-compose.test.yml)"
        echo "  TEST_COMMAND   Test command to run (default: npm run test:integration)"
        exit 0
        ;;
    --keep)
        # Run tests but don't clean up after
        main
        print_warning "Containers are still running. Run 'docker compose -f $COMPOSE_FILE down -v' to stop them."
        exit 0
        ;;
    --no-cleanup)
        # Skip initial cleanup
        check_docker
        
        # Check if container is already running
        if docker ps | grep -q $CONTAINER_NAME; then
            print_status "Using existing Typesense container..."
            run_tests
            exit $?
        else
            main
        fi
        ;;
    *)
        # Run normal flow
        trap cleanup EXIT
        main
        ;;
esac