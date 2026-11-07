import { describe, expect, it } from "vitest";
import { ikeaUrlSchema, parseIkeaProduct } from "./product-import";

const url = "https://www.ikea.com/us/en/p/besta-storage-combination-with-doors-white-stained-oak-effect-lappviken-stubbarp-white-stained-oak-effect-s29209829/";
const page = '# BESTÅStorage combination with doors, white stained oak effect\n- Measurements\n  - Width47 1/4 "\n  - Depth16 1/2 "\n  - Height29 1/8 "\nPackaging\nWidth: 16 ¼ "\nHeight: 4 ¼ "';
describe("IKEA product import", () => {
  it("uses BESTÅ assembled dimensions, not package dimensions", () => {
    expect(parseIkeaProduct(page, url)).toMatchObject({ type: "cabinet", w: 1.20015, d: 0.4191, h: 0.739775 });
  });
  it("refuses to infer assembled dimensions from packages", () => {
    expect(() => parseIkeaProduct('Packaging\nWidth: 16 ¼ "\nDepth: 20 "\nHeight: 4 ¼ "', url)).toThrow();
  });
  it("converts explicitly listed centimeters to meters", () => {
    expect(parseIkeaProduct('# BILLY Bookcase, white\n## Measurements\nWidth: 80 cm\nDepth: 28 cm\nHeight: 202 cm\nPackaging', url)).toMatchObject({ w: 0.8, d: 0.28, h: 2.02 });
  });
  it("restricts imports to real HTTPS IKEA product pages", () => {
    expect(ikeaUrlSchema.safeParse(url).success).toBe(true);
    for (const bad of ['https://www.ikea.com.evil.com/us/en/p/item/', 'http://www.ikea.com/us/en/p/item/', 'https://localhost/us/en/p/item/', 'https://www.ikea.com/us/en/']) expect(ikeaUrlSchema.safeParse(bad).success).toBe(false);
  });
});