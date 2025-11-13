# Usar a imagem oficial do Node.js como base
FROM node:20

# Definir o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copiar os arquivos do projeto para o contêiner
COPY . .

# Instalar as dependências do projeto
RUN npm install

# Expor a porta usada pelo proxy-server
EXPOSE 8080

# Comando para iniciar o servidor
CMD ["node", "proxy-server.js"]