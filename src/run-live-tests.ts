import "./env.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DEFAULT_API_URL, DEFAULT_MODEL, classifyProduct } from "./jev.js";
import { TEST_CASES } from "./test-cases.js";

const apiKey = process.env.JEV_API_KEY?.trim();
if (!apiKey) {
  console.error("ERROR: Set JEV_API_KEY in your environment or .env before live tests. No model execution occurred.");
  process.exit(2);
}

const outputDir = resolve(process.env.JEV_EVIDENCE_DIR ?? "evidence");
await mkdir(outputDir, { recursive: true });
const results = [];

for (const testCase of TEST_CASES) {
  const output = await classifyProduct(testCase.input);
  const executionObserved = output.decision_source === "jev" && output.decision_id !== null;
  const passed = executionObserved && output.category === testCase.expected_category;
  const item = {
    test_id: testCase.id,
    input: testCase.input,
    expected_category: testCase.expected_category,
    actual_output: output,
    model_execution_observed: executionObserved,
    pass: Boolean(passed),
  };
  results.push(item);
  console.log(`${testCase.id}: expected=${JSON.stringify(testCase.expected_category)} actual=${JSON.stringify(output.category)} source=${output.decision_source} execution=${executionObserved} ${passed ? "PASS" : "FAIL"}`);
}

const report = {
  generated_at_utc: new Date().toISOString(),
  endpoint: DEFAULT_API_URL,
  configured_model: DEFAULT_MODEL,
  model_execution_confirmed_for_all_tests: results.every((result) => result.model_execution_observed),
  pass_count: results.filter((result) => result.pass).length,
  test_count: results.length,
  results,
};

await writeFile(resolve(outputDir, "jev_execution_evidence.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
const lines = [
  "# Jev Product Category Classification — Live Test Results",
  "",
  `- Generated (UTC): ${report.generated_at_utc}`,
  `- Endpoint: \`${report.endpoint}\``,
  `- Configured model: \`${report.configured_model}\``,
  `- Model execution confirmed for all tests: **${report.model_execution_confirmed_for_all_tests}**`,
  `- Passed: **${report.pass_count}/${report.test_count}**`,
  "",
  "| Test | Expected | Actual | Confidence | Source | Execution observed | Pass/Fail |",
  "|---|---|---|---:|---|---|---|",
];
for (const item of results) {
  lines.push(`| ${item.test_id} | ${item.expected_category} | ${item.actual_output.category} | ${item.actual_output.confidence.toFixed(2)} | ${item.actual_output.decision_source} | ${item.model_execution_observed} | ${item.pass ? "PASS" : "FAIL"} |`);
}
lines.push("", "Full test inputs, observed outputs, probability distributions, reasons, and decision IDs are in `jev_execution_evidence.json`.");
if (!report.model_execution_confirmed_for_all_tests) lines.push("", "> At least one request did not produce a confirmed Jev decision. Do not represent it as successful model-execution evidence.");
await writeFile(resolve(outputDir, "jev_test_results.md"), `${lines.join("\n")}\n`, "utf8");
console.log(`\nEvidence saved to ${outputDir}`);
if (!report.model_execution_confirmed_for_all_tests) process.exitCode = 1;
