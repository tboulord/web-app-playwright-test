FROM mcr.microsoft.com/playwright:v1.41.2-jammy

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json playwright.config.ts .env.example ./
COPY tests ./tests

RUN npm install

CMD ["npx", "playwright", "test"]
