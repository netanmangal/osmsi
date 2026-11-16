.PHONY: setup-python setup-web test-python test-web build check

setup-python:
	python3 -m venv .venv
	.venv/bin/python -m pip install -e sdk/python -e harness

setup-web:
	npm run setup

test-python:
	.venv/bin/python -m unittest discover -s sdk/python/tests
	.venv/bin/python -m unittest discover -s harness/tests
	.venv/bin/python -m unittest discover -s pipelines -p 'test_*.py'
	.venv/bin/python -m unittest discover -s internal-tests/superlinked -p 'test_*.py'

test-web:
	npm test

build:
	npm run build

check: test-python test-web build
