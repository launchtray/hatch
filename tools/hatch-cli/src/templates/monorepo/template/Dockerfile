# Filter down to minimum input files for rush update so dependencies are cached
FROM node:18 as cache-dependencies
WORKDIR /workspace
COPY ./ ./
RUN find apps libraries tools -not -name "package.json" -mindepth 2 -maxdepth 2 -print | xargs rm -rf
RUN find apps libraries tools -mindepth 1 -maxdepth 1 -type f -print | xargs rm -rf

# By default we pre-build all modules prior to building the target app in order
# to ensure that the built modules are identical across all apps. Set the PREBUILD
# build arg to "false" to disable, or to "libraries" to only pre-build libraries.
# Note that for multi-app workspaces, parallelization provided by PREBUILD=all (the
# default) might make it the fastest option.
FROM node:18 as prebuild
RUN apt-get update
# Needed for client SDK generation
RUN apt-get -y install openjdk-11-jdk
WORKDIR /workspace
COPY --from=cache-dependencies /workspace .
RUN npm install -g @microsoft/rush
RUN rush update --purge
COPY ./libraries ./libraries
ARG PREBUILD=all
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN if [ "$PREBUILD" = "libraries" ] && [ ! -z "$(rush list -p | grep " libraries/")" ] ; then \
      rush build -p 3 --to-version-policy libraries ; \
    fi
COPY ./ ./
RUN if [ "$PREBUILD" = "all" ] ; then \
      rush build -p 3; \
    fi

# Build a specific app based on the APP_NAME build arg
FROM prebuild as build-app
ARG APP_NAME=webapp
COPY ./apps/$APP_NAME ./apps/$APP_NAME
WORKDIR /workspace/apps/$APP_NAME
RUN rush build -p 3 --to .
RUN find . -not -name "build" -mindepth 1 -maxdepth 1 -print | xargs rm -rf

# Remove sourcemaps
FROM build-app as remove-sourcemaps
RUN find . -name "*.map" -type f -delete

# Remove public dir in prep for thin server image
FROM remove-sourcemaps as clean-for-production
RUN find build -name "public" -maxdepth 1 -print | xargs rm -rf

# Create thin distroless server image from production files
FROM gcr.io/distroless/nodejs:18 as production-app
ARG APP_NAME=webapp
COPY --from=clean-for-production /workspace/apps/$APP_NAME/build /
EXPOSE 80
ENV PORT=80
ENV NODE_OPTIONS=--openssl-legacy-provider
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
