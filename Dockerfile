FROM node:22

# Copy the entire project
COPY . /app

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies and build
RUN pnpm install
RUN pnpm build

ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/index.js"]