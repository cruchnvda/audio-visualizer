.PHONY: test test-python test-js serve

test: test-python test-js

test-python:
	python3 test_serve.py -v

test-js:
	node tests/test_utils.js

serve:
	python3 serve.py
