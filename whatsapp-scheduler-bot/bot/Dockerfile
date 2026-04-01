# Dockerfile para WhatsApp Bot (auto-hospedado / VPS / GitHub Actions)
FROM node:20-alpine

# Instalar dependências do sistema
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

# Criar diretório para sessão WhatsApp
# Pode ser sobrescrito via variável AUTH_INFO_PATH ou volume montado em /app/auth_info
RUN mkdir -p /app/auth_info

# Expor porta
EXPOSE 3000

# Variável de ambiente para produção
ENV NODE_ENV=production
ENV AUTH_INFO_PATH=/app/auth_info

# Comando para iniciar
CMD ["node", "src/index.js"]

