# Day-to-day commands. Run from agent/.

.PHONY: install download-files console dev start lint format test test-integration compare-llms attacks attacks-baseline sync-catalog

ROUNDS ?= 3

install:            ## Create the virtualenv and install everything (incl. dev tools)
	uv sync

download-files:     ## Fetch local model weights (Silero VAD, turn detector). Run once.
	uv run -m livekit.agents download-files

console:            ## Talk to the agent from the terminal (no LiveKit room needed)
	uv run main.py console

dev:                ## Join LiveKit rooms with auto-reload; use the web client or the Playground
	uv run main.py dev

start:              ## Production mode
	uv run main.py start

lint:               ## Static checks
	uv run ruff check .
	uv run ruff format --check .

format:             ## Auto-fix imports and formatting
	uv run ruff check --fix .
	uv run ruff format .

test:               ## Offline unit tests only
	uv run pytest -m "not integration"

test-integration:   ## Tests that call real models (needs .env.local)
	uv run pytest -m integration

compare-llms:       ## Measure LLM time-to-first-token per model through Inference (needs .env.local)
	uv run scripts/compare_llms.py

attacks:            ## Replay the attack catalog against the guarded agent; writes docs/attacks/results-<stamp>-guardian.md
	uv run scripts/run_attacks.py --rounds $(ROUNDS)

attacks-baseline:   ## Same replay against the milestone 2 prompt-only agent (the README's "before" column)
	uv run scripts/run_attacks.py --agent prompt-only --rounds $(ROUNDS)

sync-catalog:       ## Copy the load/carrier catalog to the web client (single source in the agent)
	cp src/freight_negotiator/data/catalog.json ../web/data/catalog.json
