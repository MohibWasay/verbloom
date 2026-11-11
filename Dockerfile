# syntax=docker/dockerfile:1.7
#
# Linux toolchain for Verbloom: Go + Node + Wails + GTK/WebKit headers.
# Used to lint, test and build the Linux binary reproducibly. The desktop
# GUI itself is meant to run on the host (`make dev`), not in a container.

ARG GO_VERSION=1.27
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-trixie-slim AS node

# ---------------------------------------------------------------------------
FROM golang:${GO_VERSION}-trixie AS toolchain

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgtk-3-dev \
        libwebkit2gtk-4.1-dev \
        pkg-config \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Match the host user so files written to bind mounts keep the right owner.
ARG UID=1000
ARG GID=1000
RUN groupadd --gid "${GID}" dev \
    && useradd --uid "${UID}" --gid "${GID}" --create-home dev \
    && mkdir -p /src \
    && chown -R dev:dev /src /go

USER dev
ENV GOCACHE=/home/dev/.cache/go-build

ARG WAILS_VERSION=v2.17.0
ARG GOLANGCI_LINT_VERSION=v2.15.0
RUN go install github.com/wailsapp/wails/v2/cmd/wails@${WAILS_VERSION} \
    && go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@${GOLANGCI_LINT_VERSION} \
    && go install gotest.tools/gotestsum@latest

WORKDIR /src

# ---------------------------------------------------------------------------
FROM toolchain AS deps

COPY --chown=dev:dev go.mod go.sum ./
RUN go mod download

COPY --chown=dev:dev frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
FROM deps AS source

COPY --chown=dev:dev . .

# ---------------------------------------------------------------------------
FROM source AS check

CMD ["make", "check"]

# ---------------------------------------------------------------------------
FROM source AS build

RUN wails build -clean -trimpath -ldflags "-s -w"

# ---------------------------------------------------------------------------
# `docker build --target artifact --output build/bin .` exports the binary.
FROM scratch AS artifact

COPY --from=build /src/build/bin/ /
