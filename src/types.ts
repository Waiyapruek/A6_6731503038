export const CATEGORIES = [
  "Electronics",
  "Clothing & Accessories",
  "Home & Kitchen",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Food & Grocery",
  "Books & Stationery",
  "Toys & Games",
  "Other",
] as const;

export type ProductCategory = (typeof CATEGORIES)[number];
export type DecisionSource = "jev" | "fallback";

export interface ProductInput {
  product_title: string;
  product_description?: string;
  product_attributes?: Record<string, unknown>;
}

export interface ProductClassification {
  category: ProductCategory;
  confidence: number;
  reason: string;
  needs_review: boolean;
  probabilities: Partial<Record<ProductCategory, number>>;
  decision_source: DecisionSource;
  model: string;
  decision_id: string | null;
}

export interface TestCase {
  id: string;
  input: ProductInput;
  expected_category: ProductCategory;
}

export interface JevChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface JevApiResponse {
  id?: string;
  model?: string;
  model_version?: string;
  answers?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  latency_ms?: number;
}
