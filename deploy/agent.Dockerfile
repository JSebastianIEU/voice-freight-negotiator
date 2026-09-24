# Agent worker image. Build context is agent/:
#
#   docker build -f deploy/agent.Dockerfile -t freight-agent agent/
#
# Two stages: the builder resolves the locked dependencies with uv into a virtualenv;
# the runtime copies that virtualenv, the source and the pre-downloaded model files and
# nothing else (no uv, no compilers). Model weights are fetched at build time so a cold
# start on Cloud Run never waits on a download, and the container works without
# outbound access to Hugging Face.

FROM python:3.12-slim-bookworm AS builder

COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# Dependencies first, so a source change does not invalidate this layer.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev


FROM python:3.12-slim-bookworm AS runtime

# Non-root user; the model cache lives in its home so download-files and the
# worker agree on the path.
RUN groupadd --system app && useradd --system --gid app --create-home --home-dir /home/app app

WORKDIR /app
COPY --from=builder --chown=app:app /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    HOME=/home/app \
    HF_HUB_DISABLE_PROGRESS_BARS=1

USER app

# Local model weights (Silero VAD ships with the package; the end-of-turn fallback
# model is fetched from the Hugging Face hub). Done here, once, not on every start.
RUN python -m livekit.agents download-files

# Cloud Run sends requests to $PORT; main.py passes it to the worker's health server.
ENV PORT=8080
EXPOSE 8080

# `start` is production mode: no auto-reload, no dev-only file watching.
CMD ["python", "main.py", "start"]
