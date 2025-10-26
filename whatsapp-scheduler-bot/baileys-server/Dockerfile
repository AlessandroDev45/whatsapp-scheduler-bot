# Dockerfile para servidor Baileys no Fly.io
FROM node:20-alpine

# Instalar dependências do sistema necessárias para Baileys
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Criar diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretório para sessão WhatsApp (será montado como volume)
RUN mkdir -p /app/auth_info

# Expor porta
EXPOSE 3000

# Variável de ambiente para produção
ENV NODE_ENV=production

# Comando para iniciar
CMD ["node", "src/index.js"]

