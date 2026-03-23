FROM node:22-alpine

# Force cache bust for BEA-287 fix
ENV CACHE_BUST=20260323v2

RUN apk add --no-cache curl bash

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x start.sh && \
    addgroup -g 1001 bearcrawl && \
    adduser -D -u 1001 -G bearcrawl bearcrawl && \
    chown -R bearcrawl:bearcrawl /app

CMD ["bash", "start.sh"]
