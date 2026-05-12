FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

# Tell Puppeteer to skip installing Chrome/Chromium and use the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose port (Cloud Run uses 8080 by default)
EXPOSE 8080

# Start command
CMD [ "npm", "start" ]
