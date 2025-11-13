# Dockerfile para o backend NestJS
FROM node:20
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 5001
CMD ["npm", "run", "start:prod"]