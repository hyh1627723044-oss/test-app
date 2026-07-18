ARG DOCKER_IMAGE_PREFIX=docker.io/library
ARG GOPROXY=https://goproxy.cn,direct

FROM ${DOCKER_IMAGE_PREFIX}/golang:1.24-alpine AS builder

ARG GOPROXY
ENV GOPROXY=${GOPROXY}

WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/api ./cmd/api

FROM ${DOCKER_IMAGE_PREFIX}/alpine:3.21

WORKDIR /app
COPY --from=builder /out/api /app/api
EXPOSE 8080
CMD ["/app/api"]
