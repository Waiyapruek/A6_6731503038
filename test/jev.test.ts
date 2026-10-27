import test from "node:test";
import assert from "node:assert/strict";
import { classifyProduct, InvalidProductInputError } from "../src/jev.js";
import { CATEGORY_CRITERIA } from "../src/categories.js";
import { TEST_CASES } from "../src/test-cases.js";
import { CATEGORIES } from "../src/types.js";

const allProbabilities = Object.fromEntries(
  Object.keys(CATEGORY_CRITERIA).map((id, index) => [id, index === 2 ? 0.88 : 0.015]),
);

function mockSuccessFetch() {
  return (async (_input: string | URL | Request, init?: RequestInit) => {
    const sentBody = JSON.parse(String(init?.body)) as { questions: { category: { criteria: Record<string, string> } } };
    assert.equal(Object.keys(sentBody.questions.category.criteria).length, 9);
    return new Response(JSON.stringify({
      id: "dec_test_123456",
      model: "jev-1.13",
      answers: {
        category: {
          type: "choice",
          choice: "home_kitchen",
          probabilities: allProbabilities,
          confidence: 0.88,
        },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

test("configuration has at least three output choices and five distinct test inputs", () => {
  assert.ok(CATEGORIES.length >= 3);
  assert.equal(TEST_CASES.length, 5);
  assert.equal(new Set(TEST_CASES.map((item) => item.input.product_title)).size, 5);
});

test("parses a Jev choice answer into the stable output contract", async () => {
  const result = await classifyProduct(TEST_CASES[0]!.input, {
    apiKey: "test-key",
    fetchImpl: mockSuccessFetch(),
  });
  assert.equal(result.category, "Home & Kitchen");
  assert.equal(result.decision_source, "jev");
  assert.equal(result.decision_id, "dec_test_123456");
  assert.equal(result.needs_review, false);
  assert.equal(result.probabilities["Home & Kitchen"], 0.88);
});

test("returns safe fallback when API key is missing", async () => {
  const result = await classifyProduct(TEST_CASES[0]!.input, { apiKey: "" });
  assert.equal(result.category, "Other");
  assert.equal(result.decision_source, "fallback");
  assert.equal(result.needs_review, true);
  assert.equal(result.decision_id, null);
});

test("rejects invalid input before invoking API", async () => {
  let called = false;
  const fetchImpl = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  await assert.rejects(
    classifyProduct({ product_title: "  " }, { apiKey: "test-key", fetchImpl }),
    InvalidProductInputError,
  );
  assert.equal(called, false);
});

test("returns fallback for an unknown category from Jev", async () => {
  const fetchImpl = (async () => new Response(JSON.stringify({
    id: "dec_invalid",
    model: "jev-1.13",
    answers: { category: { type: "choice", choice: "unknown_category", probabilities: allProbabilities, confidence: 0.9 } },
  }), { status: 200 })) as typeof fetch;
  const result = await classifyProduct(TEST_CASES[0]!.input, { apiKey: "test-key", fetchImpl });
  assert.equal(result.decision_source, "fallback");
  assert.equal(result.category, "Other");
  assert.equal(result.needs_review, true);
});

test("returns fallback for HTTP errors", async () => {
  const fetchImpl = (async () => new Response("service error", { status: 503 })) as typeof fetch;
  const result = await classifyProduct(TEST_CASES[0]!.input, { apiKey: "test-key", fetchImpl });
  assert.equal(result.decision_source, "fallback");
  assert.match(result.reason, /HTTP 503/);
});
