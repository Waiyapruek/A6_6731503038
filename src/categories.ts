import { CATEGORIES, type ProductCategory } from "./types.js";

/** Jev option IDs use simple snake_case; the app maps them to display labels. */
export const CATEGORY_ID_TO_LABEL = {
  electronics: "Electronics",
  clothing_accessories: "Clothing & Accessories",
  home_kitchen: "Home & Kitchen",
  beauty_personal_care: "Beauty & Personal Care",
  sports_outdoors: "Sports & Outdoors",
  food_grocery: "Food & Grocery",
  books_stationery: "Books & Stationery",
  toys_games: "Toys & Games",
  other: "Other",
} as const satisfies Record<string, ProductCategory>;

export type CategoryId = keyof typeof CATEGORY_ID_TO_LABEL;

export const CATEGORY_LABEL_TO_ID: Record<ProductCategory, CategoryId> = Object.fromEntries(
  Object.entries(CATEGORY_ID_TO_LABEL).map(([id, label]) => [label, id]),
) as Record<ProductCategory, CategoryId>;

export const CATEGORY_CRITERIA: Record<CategoryId, string> = {
  electronics: "Electronic devices and accessories, computers, phones, cameras, smart devices, and electronic components.",
  clothing_accessories: "Clothing, shoes, bags, jewelry, watches worn as accessories, and fashion accessories.",
  home_kitchen: "Furniture, lamps, kitchenware, cookware, household items, home decor, and home appliances primarily used in the home.",
  beauty_personal_care: "Skincare, cosmetics, haircare, fragrance, grooming, and personal hygiene products.",
  sports_outdoors: "Sports equipment, fitness equipment, camping gear, outdoor recreation products, and athletic accessories not primarily apparel.",
  food_grocery: "Food, ingredients, beverages, snacks, and other grocery consumables.",
  books_stationery: "Printed books, e-books when represented as products, notebooks, pens, paper, and office or school stationery.",
  toys_games: "Toys, puzzles, board games, play sets, and recreational products primarily intended for play.",
  other: "Products that do not fit the categories above or lack sufficient information for a reliable category assignment.",
};

export function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
