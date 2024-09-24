# Usa la imagen oficial de Node.js como base
FROM node:18-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia el archivo package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install --production

# Copia el resto de la aplicación
COPY . .

# Expone el puerto que usa la aplicación (Railway asigna un puerto, pero es importante exponerlo)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
