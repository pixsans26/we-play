FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npx tsc

# Expose port (adjust if your app uses a different one, default is 4000)
EXPOSE 4000

# Start the server
CMD ["node", "dist/index.js"]
