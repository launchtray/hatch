FROM node:12 as build

WORKDIR /app
COPY ./ ./
RUN npm install
RUN npm run build

FROM gcr.io/distroless/nodejs:12

COPY --from=build /app/build/server.js /app/build/assets.json /
COPY --from=build /app/build/public /public

EXPOSE 80
ENV PORT=80
CMD ["server.js"]
