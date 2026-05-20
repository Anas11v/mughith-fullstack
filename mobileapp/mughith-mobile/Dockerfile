FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV EXPO_NO_TELEMETRY=1

EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start", "--lan", "--go", "--port", "8081"]
