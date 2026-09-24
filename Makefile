.DEFAULT_GOAL := help

PORT = 8802

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "  make serve         Start dev server → http://localhost:$(PORT)"
	@echo "  make kill          Kill this project's HTTP server"
	@echo "  make test          Node suite: the embed URL contract and page parity"
	@echo "  make test-browser  Serve, then open /tests/browser.html for the embed contract"
	@echo ""

# ── Dev server ────────────────────────────────────────────────────────────────
.PHONY: serve
serve:
	@echo "Serving → http://localhost:$(PORT)"
	@if [ -f ../../scripts/serve.py ]; then python3 ../../scripts/serve.py $(PORT); else python3 -m http.server $(PORT); fi

# ── Tests ─────────────────────────────────────────────────────────────────────
# Zero dependencies: Node's own runner, no npm install, no node_modules.
# --disable-warning silences MODULE_TYPELESS_PACKAGE_JSON: there is no
# package.json here on purpose, and the browser loads visualizer/js/*.js with
# <script type="module"> regardless.
NODE_TEST = node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON

.PHONY: test
test:
	@$(NODE_TEST) tests/*.test.mjs

# What Node cannot reach: the iframe embed, its postMessage contract, and the
# promise that it writes nothing and requests nothing off-origin. Serves the
# site and prints the URL; open it and read the result table.
.PHONY: test-browser
test-browser:
	@echo "Browser tests → http://localhost:$(PORT)/tests/browser.html"
	@$(MAKE) --no-print-directory serve

# ── Kill ──────────────────────────────────────────────────────────────────────
.PHONY: kill
kill:
	@lsof -ti :$(PORT) | xargs kill 2>/dev/null && echo "Stopped server on port $(PORT)" || echo "No server running on port $(PORT)"
