.PHONY: install dev build preview test check content-validate verify-build fetch-stats fetch-project-stars fetch-note-views fetch-dsa

.DEFAULT_GOAL := dev

PNPM ?= pnpm

install:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) dev

build:
	$(PNPM) build

preview:
	$(PNPM) preview

test:
	$(PNPM) test

content-validate:
	$(PNPM) content:validate

check:
	$(PNPM) check

verify-build:
	$(PNPM) verify:build

fetch-stats:
	$(PNPM) fetch:stats

fetch-project-stars:
	$(PNPM) fetch:project-stars

fetch-note-views:
	$(PNPM) fetch:note-views

fetch-dsa:
	$(PNPM) fetch:dsa
