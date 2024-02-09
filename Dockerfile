# ---- Base Node ----
FROM --platform=linux/amd64 node:21-alpine AS base
# Set working directory
WORKDIR /usr/src/app
# Copy project file
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies
# Install node packages
RUN npm set progress=false && npm config set depth 0
RUN npm install --only=production
# Copy production node_modules aside
RUN cp -R node_modules prod_node_modules
# Install ALL node_modules, including 'devDependencies'
RUN npm install

# ---- Build ----
# build step (TypeScript to JavaScript)
FROM dependencies AS build
COPY . .
# Build static assets
RUN npm run build

# ---- Release ----
FROM --platform=linux/amd64 node:21-alpine AS release
# Set working directory
WORKDIR /usr/src/app
# Copy production node_modules
COPY --from=dependencies /usr/src/app/prod_node_modules ./node_modules
# Copy built assets from the 'build' stage
COPY --from=build /usr/src/app/dist ./dist
# Copy other necessary files like package.json if you have postinstall scripts
COPY --from=build /usr/src/app/package*.json ./
# Ensure we have the .env file if your app needs it (remove if not used)
COPY --from=build /usr/src/app/.env ./

# The command to run when starting the container
CMD ["node", "dist/src/index.js"]
