FROM node:22-alpine

WORKDIR /app

# Copy package manifests first
COPY package.json package-lock.json ./

# Prisma schema is needed during npm install because we run `prisma generate` in postinstall
COPY prisma ./prisma

RUN npm ci

COPY . .

# Generate Prisma client (safe to run again; ensures client is in sync)
RUN npx prisma generate

EXPOSE 3000

# Run migrations then start dev server
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
