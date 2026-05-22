FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js nearbyPresence.js nearbySocial.js profile.js profileStore.js profileSftp.js profileS3.js profileGabiaHttp.js profileStorage.js ./

ENV NODE_ENV=production
# Railway injects PORT at runtime; app binds 0.0.0.0:PORT
CMD ["node", "index.js"]
