# Use Node.js 21 Alpine as base image
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./

RUN npm ci --fetch-timeout=600000

COPY . .

RUN npx prisma generate
RUN npm run build



# USER remix

EXPOSE 3000

ENV PORT=3000

CMD ["npm", "start"]
