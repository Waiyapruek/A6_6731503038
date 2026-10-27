import { classifyProduct } from "./jev.js";

const demoProduct = {
  product_title: "USB-C Rechargeable LED Desk Lamp",
  product_description: "A dimmable LED lamp for reading and working at a desk.",
  product_attributes: { power_source: "rechargeable battery", color: "white" },
};

const result = await classifyProduct(demoProduct);
console.log(JSON.stringify(result, null, 2));
if (result.decision_source !== "jev") {
  console.error("No live Jev decision was confirmed. Check your JEV_API_KEY and endpoint configuration.");
  process.exitCode = 1;
}
