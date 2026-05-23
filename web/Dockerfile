FROM node:20-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json* ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web .
ENV NEXT_PUBLIC_API_BASE=http://localhost:8000
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
ENV NEXT_PUBLIC_API_BASE=http://localhost:8000
EXPOSE 3000
CMD ["npm", "start"]
