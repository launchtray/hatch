FROM node:12 as build
WORKDIR /app
COPY ./package.json ./
RUN npm install
COPY ./ ./
RUN npm run build

FROM build as production-build
RUN find . -name "*.map" -type f -delete
RUN rm -rf /app/build/public

FROM gcr.io/distroless/nodejs:12 as production-app
COPY --from=production-build /app/build /
EXPOSE 80
ENV PORT=80
CMD ["server.js"]

FROM alpine as bundle-app
COPY --from=build /app/build /app/build
