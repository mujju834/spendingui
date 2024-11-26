# Stage 1: Build Stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
COPY .env .env

RUN npm run build

# Stage 2: Production Stage
FROM nginx:stable-alpine

# Copy the build output to Nginx's default static directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
