FROM rust:1.85-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY web ./web
RUN cargo build --release --locked
FROM debian:bookworm-slim
ARG VCS_REF=unknown
LABEL org.opencontainers.image.source="https://github.com/richardnoragon/stitchinator" \
      org.opencontainers.image.revision="${VCS_REF}"
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu && rm -rf /var/lib/apt/lists/*
RUN useradd --uid 10001 --create-home stitchinator && mkdir /data && chown stitchinator:stitchinator /data
COPY --from=build /app/target/release/stitchinator /usr/local/bin/stitchinator
USER stitchinator
ENV STITCHINATOR_BIND=0.0.0.0:8080 STITCHINATOR_DATA=/data
VOLUME ["/data"]
EXPOSE 8080
CMD ["stitchinator"]
