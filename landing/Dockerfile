FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_KEYCLOAK_URL=https://auth.restockoffice.com
ARG VITE_KEYCLOAK_REALM=restock-office
ARG VITE_KEYCLOAK_CLIENT_ID=restock-office-web
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
