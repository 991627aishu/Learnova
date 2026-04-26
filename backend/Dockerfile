FROM node:20-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Final compile
RUN npx tsc -b

CMD ["node", "dist/index.js"]
