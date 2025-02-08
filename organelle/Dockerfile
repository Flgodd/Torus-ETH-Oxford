# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory
WORKDIR /app
ARG NUM_REPLICAS
ARG REPLICA
ARG DBADDR
ARG MULTIADDR

ENV REPLICA=${REPLICA}
ENV NUM_REPLICAS=${NUM_REPLICAS}
ENV DBADDR=${DBADDR}
ENV MULTIADDR=${MULTIADDR}
# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the app
COPY server.js .
COPY config/ ./config/

# Expose the port
EXPOSE 3000
EXPOSE 4001

# Command to run the app (uses PORT from environment)
# Set up with two replicas for now
CMD ["node", "server.js"]