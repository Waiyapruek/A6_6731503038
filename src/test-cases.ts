import type { TestCase } from "./types.js";

export const TEST_CASES: TestCase[] = [
  {
    id: "TC01",
    input: {
      product_title: "USB-C Rechargeable LED Desk Lamp",
      product_description: "A dimmable LED lamp for reading and working at a desk.",
      product_attributes: { power_source: "rechargeable battery", color: "white" },
    },
    expected_category: "Home & Kitchen",
  },
  {
    id: "TC02",
    input: {
      product_title: "Men's Lightweight Waterproof Running Jacket",
      product_description: "A breathable zip-up jacket designed for running in rainy weather.",
      product_attributes: { size: "M", material: "polyester", gender: "men" },
    },
    expected_category: "Clothing & Accessories",
  },
  {
    id: "TC03",
    input: {
      product_title: "SPF 50 Facial Sunscreen Lotion",
      product_description: "Daily facial sunscreen that protects skin from UVA and UVB rays.",
      product_attributes: { skin_type: "all", volume_ml: 50 },
    },
    expected_category: "Beauty & Personal Care",
  },
  {
    id: "TC04",
    input: {
      product_title: "Official Size 7 Indoor Basketball",
      product_description: "A durable basketball for practice and indoor recreational play.",
      product_attributes: { size: 7, sport: "basketball" },
    },
    expected_category: "Sports & Outdoors",
  },
  {
    id: "TC05",
    input: {
      product_title: "Durum Wheat Spaghetti Pasta 500 g",
      product_description: "Dried pasta made from durum wheat semolina for home cooking.",
      product_attributes: { weight_g: 500, food_type: "pasta" },
    },
    expected_category: "Food & Grocery",
  },
];
