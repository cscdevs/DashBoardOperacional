# Estágio 1: Build da aplicação React/Vite
FROM node:20-alpine as build

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências (usando legacy-peer-deps conforme nossa configuração anterior)
RUN npm ci --legacy-peer-deps

# Copiar o restante dos arquivos do projeto
COPY . .

# Fazer o build da aplicação para produção
RUN npm run build

# Estágio 2: Servidor Nginx para rodar a aplicação estática
FROM nginx:alpine

# Copiar o build gerado no estágio anterior para a pasta padrão do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx (para suportar React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor a porta 80
EXPOSE 80

# Iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
