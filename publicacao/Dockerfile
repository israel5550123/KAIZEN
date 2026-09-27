# Imagem do tradutor do Kaizen: Node com a tag exata (import.meta.main só existe a partir do 24.2),
# fuso de Fortaleza e o crond do Alpine em primeiro plano. O TypeScript roda direto no Node, sem compilação.
FROM node:24.18.0-alpine
RUN apk add --no-cache tzdata
ENV TZ=America/Fortaleza
WORKDIR /kaizen
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY tradutor/ tradutor/
COPY sql/ sql/
COPY publicacao/crontab /etc/crontabs/root
# Sem MAILTO no crontab, a saída de cada execução vai para o log do serviço (docker service logs).
CMD ["crond", "-f", "-d", "8"]
