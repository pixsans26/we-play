# Stage 1: Build the static web app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code (respecting .dockerignore)
COPY . .

# Build arguments for environment variables
ARG EXPO_PUBLIC_API_URL=https://test-we-play-server.fqjdvf.easypanel.host
ARG EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBm2bmcdfpHPsp_4Og8K9Mhx-yg3FUTgxE
ARG EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=card-game-b2a53.firebaseapp.com
ARG EXPO_PUBLIC_FIREBASE_PROJECT_ID=card-game-b2a53
ARG EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=card-game-b2a53.firebasestorage.app
ARG EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=216905121121
ARG EXPO_PUBLIC_FIREBASE_APP_ID=1:216905121121:web:2b1862bc9cf5cb3db5d920
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=216905121121-hauvrc9qs0g3l37ai3a9d429vcsejh5f.apps.googleusercontent.com

ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_FIREBASE_API_KEY=$EXPO_PUBLIC_FIREBASE_API_KEY
ENV EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV EXPO_PUBLIC_FIREBASE_PROJECT_ID=$EXPO_PUBLIC_FIREBASE_PROJECT_ID
ENV EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV EXPO_PUBLIC_FIREBASE_APP_ID=$EXPO_PUBLIC_FIREBASE_APP_ID
ENV EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

# Export static production web bundle
RUN npx expo export --platform web

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Self-contained Nginx SPA routing & gzip configuration
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
