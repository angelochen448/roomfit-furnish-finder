import { createServerFn } from "@tanstack/react-start";
import { ikeaUrlSchema, parseIkeaProduct, type ImportedProduct } from "./product-import";

export const importIkeaProduct = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => ({ url: ikeaUrlSchema.parse(input.url) }))
  .handler(async ({ data }): Promise<{ product: ImportedProduct | null; error: string | null }> => {
    const key = process.env['FIRECRAWL_API_KEY'];
    const lovableKey = process.env['LOVABLE_API_KEY'];
    if (!key || !lovableKey) return { product: null, error: "Product-link importing is not connected." };
    const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": key },
      body: JSON.stringify({ url: data.url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Product page request failed [${response.status}]: ${body}`);
      return { product: null, error: `Product-page reading failed (${response.status}): ${body.slice(0, 500)}` };
    }
    const result = await response.json() as { success?: boolean; error?: string; markdown?: string; data?: { markdown?: string } };
    const markdown = result.data?.markdown ?? result.markdown;
    if (!markdown || result.success === false) return { product: null, error: result.error ?? "IKEA’s product page could not be read. Try again later." };
    try { return { product: parseIkeaProduct(markdown, data.url), error: null }; }
    catch (error) { return { product: null, error: error instanceof Error ? error.message : "The product could not be imported." }; }
  });