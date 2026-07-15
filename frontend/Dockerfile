# Stage 1: Build da aplicação React + TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o restante do código
COPY . .

# Compila o projeto para produção
RUN npm run build

# Stage 2: Servidor Web Nginx para servir os estáticos
FROM nginx:alpine

# Copia os arquivos compilados do React para a pasta de arquivos estáticos do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx para suportar SPAs
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80 do container
EXPOSE 80

# Inicia o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]
