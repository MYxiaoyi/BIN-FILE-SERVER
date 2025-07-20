FROM node:18

WORKDIR /usr/src/app

# 先复制package.json并安装依赖
COPY package*.json ./
RUN npm install

# 然后复制所有文件
COPY . .

# 创建必要的目录
RUN mkdir -p /usr/src/app/bins /usr/src/app/public

EXPOSE 3000

CMD ["node", "server.js"]