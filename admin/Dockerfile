FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Pass build arguments
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXTAUTH_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL

ARG AUTH_SECRET
ENV AUTH_SECRET=$AUTH_SECRET

# Build the Next.js admin app
RUN npm run build

# Expose port (adjust if your app uses a different one, default is 3000)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
