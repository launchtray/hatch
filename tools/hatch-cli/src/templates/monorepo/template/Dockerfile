# Filter down to minimum input files for rush update so dependencies are cached
FROM node:12 as prebuild
WORKDIR /workspace
COPY ./ ./
RUN find apps libraries tools -not -name "package.json" -mindepth 2 -maxdepth 2 -print | xargs rm -rf
RUN find apps libraries tools -mindepth 1 -maxdepth 1 -type f -print | xargs rm -rf

# Build all libraries. By default we build all libraries prior to building the target app
# in order to ensure that the built libraries are identical across all apps. Set the
# PREBUILD_ALL_LIBRARIES build arg to false to disable.
FROM node:12 as build-libraries
WORKDIR /workspace
COPY --from=prebuild /workspace .
RUN npm install -g @microsoft/rush
RUN rush update --purge
COPY ./libraries ./libraries
ARG PREBUILD_ALL_LIBRARIES=true
RUN if [ "$PREBUILD_ALL_LIBRARIES" = "true" ] && [ ! -z "$(rush list -p | grep " libraries/")" ] ; then \
      rush build --to-version-policy libraries ; \
    fi

# Build a specific app based on the APP_NAME build arg
FROM build-libraries as build-app
ARG APP_NAME=webapp
COPY ./apps/$APP_NAME ./apps/$APP_NAME
WORKDIR /workspace/apps/$APP_NAME
RUN rush build --to .
RUN find . -not -name "build" -mindepth 1 -maxdepth 1 -print | xargs rm -rf

# Remove sourcemaps
FROM build-app as remove-sourcemaps
RUN find . -name "*.map" -type f -delete

# Remove public dir in prep for thin server image
FROM remove-sourcemaps as clean-for-production
RUN find build -name "public" -maxdepth 1 -print | xargs rm -rf

# Create thin distroless server image from production files
FROM gcr.io/distroless/nodejs:12 as production-app
ARG APP_NAME=webapp
COPY --from=clean-for-production /workspace/apps/$APP_NAME/build /
EXPOSE 80
ENV PORT=80
CMD ["server.js"]

# Create thin image for serving static files
FROM nginx:alpine as static-server
ARG APP_NAME=webapp
RUN rm -rf /usr/share/nginx/html/*
COPY --from=remove-sourcemaps /workspace/apps/$APP_NAME/build/public /usr/share/nginx/html

# Create thin image for bundling static assets or other build artifacts
# This needs to be the final stage in order for the AWS CDK to use it for bundling
FROM alpine as bundle-app
ARG APP_NAME=webapp
COPY --from=build-app /workspace/apps/$APP_NAME/build /app/build


