FROM node:20-alpine

WORKDIR /app

# Copiar dependências primeiro
COPY package*.json ./
RUN npm ci

# Copiar o restante do código
COPY . .

# Expor a porta 3001
EXPOSE 3001

# Iniciar o servidor
CMD ["npm", "start"]
