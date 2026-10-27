# Jev Product Category Classification (TypeScript)

TypeScript implementation for the A6 Platform Development assignment. It uses Jev's typed `choice` decision capability to classify product details into one of nine predefined categories, validates the API response, and returns a stable JSON result. No runtime npm dependencies are required; TypeScript and Node type definitions are development dependencies.

## Requirements

- Node.js 20 or later
- npm
- A Jev API key for live model tests

## Setup

```bash
npm install
```

Copy `.env.example` to `.env`, then put your own key in `.env`:

```dotenv
JEV_API_KEY=YOUR_REAL_API_KEY
JEV_API_URL=https://jev-ai.org/api/v1/systemone/
JEV_MODEL=jev-1.13
JEV_CONFIDENCE_THRESHOLD=0.65
JEV_TIMEOUT_MS=20000
```

Do not commit `.env`, place the key in frontend/browser code, or include the key in the assignment submission. The default endpoint shown here follows the Jev API documentation at https://jev-ai.org/docs/ and https://jev-ai.org/docs/decisions/. If your lecturer provided a different Jev host or credentials, follow that service's documentation and change `JEV_API_URL` accordingly.

PowerShell alternative without a `.env` file:

```powershell
$env:JEV_API_KEY="YOUR_REAL_API_KEY"
npm run live:test
```

## Run one live classification

```bash
npm start
```

This makes a real API request. If no API key is set or Jev fails, it prints the safe fallback and exits unsuccessfully; a fallback is not evidence of model execution.

## Run local/offline tests

```bash
npm test
```

The tests use mocked HTTP responses and make no live model request. They check input validation, the nine category choices, the output contract, successful-response processing, missing-key fallback, invalid-category fallback, and API error fallback. These tests demonstrate application logic, not actual model execution.

## Run the five live model tests and produce evidence

```bash
npm run live:test
```

This makes five API calls, one for each test case in `src/test-cases.ts`. It saves:

- `evidence/jev_execution_evidence.json` — UTC timestamp, endpoint, configured model, every input, actual output, decision ID and pass/fail.
- `evidence/jev_test_results.md` — concise results table for your assignment template.

A live decision is counted as observed only if the API returns a structured answer and a decision ID. A test passes only if the live category matches the human-defined expected category. Model disagreements remain visible as failures rather than being rewritten to look successful.

## Input contract

```json
{
  "product_title": "USB-C Rechargeable LED Desk Lamp",
  "product_description": "A dimmable LED lamp for reading and working at a desk.",
  "product_attributes": {
    "power_source": "rechargeable battery",
    "color": "white"
  }
}
```

`product_title` is required (non-empty string, max 300 characters). `product_description` is optional (string, max 3,000 characters). `product_attributes` is an optional JSON object.

## Categories

- `Electronics`
- `Clothing & Accessories`
- `Home & Kitchen`
- `Beauty & Personal Care`
- `Sports & Outdoors`
- `Food & Grocery`
- `Books & Stationery`
- `Toys & Games`
- `Other`

The Jev request uses snake_case option IDs such as `home_kitchen`; the TypeScript app maps these IDs into the display category labels.

## Application output

See `output_schema.json`. Each result contains `category`, `confidence`, `reason`, `needs_review`, `probabilities`, `decision_source`, `model`, and `decision_id`.

The `reason` is an application-generated summary of Jev's category and confidence, not free-text reasoning produced by Jev. The API's typed choice answer returns a choice, probability distribution and confidence. `needs_review` is true for a low confidence score, `Other`, or a small gap between the top two category probabilities.

## Fallback behavior

- Invalid product input: throws an input validation error before making a request.
- Missing key, timeout, network error, non-2xx response, malformed JSON, malformed response shape, invalid category, or invalid probabilities: returns `category: "Other"`, `confidence: 0`, `needs_review: true`, and `decision_source: "fallback"`.
- Low-confidence or ambiguous model output: returns the model's category but sets `needs_review: true`.

## Project structure

```text
src/
  env.ts              # Minimal .env loader using Node built-ins
  categories.ts       # Category labels and Jev choice criteria
  types.ts            # Input/output TypeScript interfaces
  jev.ts              # API client, validation, and fallback
  cli.ts              # One-product demo
  test-cases.ts       # Five expected test cases
  run-live-tests.ts   # Executes live calls and writes evidence
 test/
  jev.test.ts         # Offline automated tests
output_schema.json    # JSON Schema for app output
```
