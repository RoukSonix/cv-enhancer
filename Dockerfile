FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# Run migrations then start dev server
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
