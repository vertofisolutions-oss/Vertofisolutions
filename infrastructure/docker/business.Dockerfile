FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install
CMD ["pnpm", "start"]
