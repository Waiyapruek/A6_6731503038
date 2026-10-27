import "./env.js";
import { CATEGORY_CRITERIA, CATEGORY_ID_TO_LABEL, type CategoryId } from "./categories.js";
import { CATEGORIES, type JevApiResponse, type ProductCategory, type ProductClassification, type ProductInput } from "./types.js";

export const DEFAULT_API_URL = process.env.JEV_API_URL?.trim() || "https://jev-ai.org/api/v1/systemone/";
export const DEFAULT_MODEL = process.env.JEV_MODEL?.trim() || "jev-1.13";
export const DEFAULT_CONFIDENCE_THRESHOLD = parseThreshold(process.env.JEV_CONFIDENCE_THRESHOLD, 0.65);
export const DEFAULT_TIMEOUT_MS = parsePositiveInteger(process.env.JEV_TIMEOUT_MS, 20_000);

function parseThreshold(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export interface ClassifyOptions {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  confidenceThreshold?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class InvalidProductInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidProductInputError";
  }
}

function validateProductInput(input: unknown): ProductInput {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidProductInputError("Product input must be a JSON object.");
  }
  const candidate = input as Record<string, unknown>;
  const title = candidate.product_title;
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new InvalidProductInputError("product_title is required and must be a non-empty string.");
  }
  if (title.trim().length > 300) {
    throw new InvalidProductInputError("product_title must be 300 characters or fewer.");
  }

  const description = candidate.product_description ?? "";
  if (typeof description !== "string") {
    throw new InvalidProductInputError("product_description must be a string when provided.");
  }
  if (description.length > 3000) {
    throw new InvalidProductInputError("product_description must be 3000 characters or fewer.");
  }

  const attributes = candidate.product_attributes ?? {};
  if (attributes === null || typeof attributes !== "object" || Array.isArray(attributes)) {
    throw new InvalidProductInputError("product_attributes must be a JSON object when provided.");
  }
  try {
    JSON.stringify(attributes);
  } catch {
    throw new InvalidProductInputError("product_attributes must be JSON-serializable.");
  }
  return {
    product_title: title.trim(),
    product_description: description.trim(),
    product_attributes: attributes as Record<string, unknown>,
  };
}

function fallback(reason: string, model: string): ProductClassification {
  return {
    category: "Other",
    confidence: 0,
    reason: `Fallback used: ${reason} Manual classification is required.`,
    needs_review: true,
    probabilities: {},
    decision_source: "fallback",
    model,
    decision_id: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mapProbabilities(value: unknown): Partial<Record<ProductCategory, number>> {
  if (!isRecord(value)) throw new Error("Jev returned no category probability distribution.");
  const mapped: Partial<Record<ProductCategory, number>> = {};
  for (const [optionId, probability] of Object.entries(value)) {
    if (!Object.hasOwn(CATEGORY_ID_TO_LABEL, optionId)) {
      throw new Error("Jev returned an unknown category probability label.");
    }
    if (typeof probability !== "number" || !Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new Error("Jev returned an invalid category probability.");
    }
    const label = CATEGORY_ID_TO_LABEL[optionId as CategoryId];
    mapped[label] = probability;
  }
  // A choice answer is expected to include a probability for all configured choices.
  if (Object.keys(mapped).length !== CATEGORIES.length) {
    throw new Error("Jev returned an incomplete category probability distribution.");
  }
  return mapped;
}

function parseJevResponse(payload: unknown, configuredModel: string, threshold: number): ProductClassification {
  if (!isRecord(payload) || !isRecord(payload.answers) || !isRecord(payload.answers.category)) {
    throw new Error("Jev returned an invalid response shape.");
  }
  const answer = payload.answers.category;
  if (answer.type !== "choice") throw new Error("Jev did not return a choice answer.");
  if (typeof answer.choice !== "string" || !Object.hasOwn(CATEGORY_ID_TO_LABEL, answer.choice)) {
    throw new Error("Jev returned a category outside the configured choices.");
  }
  if (typeof answer.confidence !== "number" || !Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) {
    throw new Error("Jev returned an invalid confidence value.");
  }

  const probabilities = mapProbabilities(answer.probabilities);
  const category = CATEGORY_ID_TO_LABEL[answer.choice as CategoryId];
  const ranked = Object.entries(probabilities).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const topProbability = ranked[0]?.[1] ?? 0;
  const secondProbability = ranked[1]?.[1] ?? 0;
  const margin = topProbability - secondProbability;
  const needsReview = answer.confidence < threshold || category === "Other" || margin < 0.1;
  const model = typeof payload.model === "string" ? payload.model : configuredModel;
  const decisionId = typeof payload.id === "string" ? payload.id : null;
  const reason = `Classified as ${category} with model-reported confidence ${answer.confidence.toFixed(2)}. ${needsReview ? "Manual review is recommended because the result is low-confidence, ambiguous, or categorized as Other." : "The result passed the configured review threshold."}`;

  const result: ProductClassification = {
    category,
    confidence: answer.confidence,
    reason,
    needs_review: needsReview,
    probabilities,
    decision_source: "jev",
    model,
    decision_id: decisionId,
  };
  validateOutput(result);
  return result;
}

export function validateOutput(result: ProductClassification): void {
  if (!CATEGORIES.includes(result.category)) throw new Error("Output category is not allowed.");
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) throw new Error("Output confidence must be between 0 and 1.");
  if (typeof result.reason !== "string" || result.reason.trim().length === 0) throw new Error("Output reason is required.");
  if (typeof result.needs_review !== "boolean") throw new Error("needs_review must be a boolean.");
  if (result.decision_source !== "jev" && result.decision_source !== "fallback") throw new Error("Invalid decision_source.");
  if (typeof result.model !== "string") throw new Error("model must be a string.");
  if (result.decision_id !== null && typeof result.decision_id !== "string") throw new Error("decision_id must be a string or null.");
  if (!isRecord(result.probabilities)) throw new Error("probabilities must be an object.");
  for (const [category, probability] of Object.entries(result.probabilities)) {
    if (!CATEGORIES.includes(category as ProductCategory)) throw new Error(`Unexpected probability category: ${category}`);
    if (typeof probability !== "number" || !Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error(`Invalid probability for ${category}.`);
  }
}

/** Classify one product. Invalid caller input throws; service errors return a safe fallback. */
export async function classifyProduct(input: unknown, options: ClassifyOptions = {}): Promise<ProductClassification> {
  const product = validateProductInput(input);
  const threshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const model = options.model ?? DEFAULT_MODEL;
  const apiUrl = options.apiUrl ?? DEFAULT_API_URL;
  const apiKey = (options.apiKey ?? process.env.JEV_API_KEY ?? "").trim();

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new RangeError("confidenceThreshold must be between 0 and 1.");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be a positive integer.");
  }
  if (!apiKey) return fallback("JEV_API_KEY is not configured.", model);

  const requestBody = {
    model,
    state: product,
    questions: {
      category: {
        type: "choice",
        instructions: "Classify this product by its primary product type or use. Consider the title, description, and attributes together. Select exactly one category. If information is insufficient or no category fits, select Other. Do not classify apparel as sports equipment merely because it is used during sports; use Clothing & Accessories for wearable apparel.",
        criteria: CATEGORY_CRITERIA,
      },
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Do not return raw service messages or headers, which could contain sensitive details.
      return fallback(`Jev API returned HTTP ${response.status}.`, model);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return fallback("Jev returned invalid JSON.", model);
    }
    try {
      return parseJevResponse(payload, model, threshold);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unexpected response";
      return fallback(message, model);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return fallback("Jev request timed out.", model);
    return fallback("Jev API could not be reached.", model);
  } finally {
    clearTimeout(timer);
  }
}
