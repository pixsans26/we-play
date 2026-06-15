FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the Next.js admin app
RUN npm run build

# Expose port (adjust if your app uses a different one, default is 3000)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
