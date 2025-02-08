#!/bin/bash

# Configurable values
IMAGE_NAME="dbservice"  # Docker image name
START_PORT=3001           # First port to map
CONTAINER_PREFIX="dbservice" # Prefix for container names
NUM_REPLICAS=${1:-"2"}
# Run multiple containers
echo "Building container..."
docker build -t $IMAGE_NAME .

echo "Starting root container on $START_PORT with $NUM_REPLICAS replicas..."
docker run --rm -p $START_PORT:3000 -e NUM_REPLICAS=$NUM_REPLICAS --name $IMAGE_NAME $IMAGE_NAME
