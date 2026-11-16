# Provider checks

Small, reusable checks for development. These are not safety evaluations and
produce no scores. The private scratch repository, load tests, credentials, and
captured responses remain outside this public repository.

Use Python 3.10 or newer; no packages need installing.

```bash
# From the repository root, fill in the local file first.
cp internal-tests/.env.example internal-tests/.env
set -a
source internal-tests/.env
set +a

python3 internal-tests/superlinked/smoke.py
# Optional: one generation request, which may consume provider credits.
python3 internal-tests/superlinked/smoke.py --model 'a-model-id-from-the-list'
```

The default check fetches `/v1/models` and prints model IDs. Supplying `--model`
sends one short prompt to `/v1/chat/completions`, with a 600-token output limit
and a 60-second timeout. There are no retries or concurrent requests. The token
limit is not a spending cap; failed requests may still be billed.

The script reads environment variables, not `.env` files. You can source an
existing private environment file instead. Keep keys out of shell command
arguments, browser code, and Git. The check prints only a summary of a completion;
it does not save prompts or responses.

Run the offline tests without credentials or network access:

```bash
python3 -m unittest discover -s internal-tests/superlinked -p 'test_*.py'
```
