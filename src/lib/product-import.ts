import { z } from "zod";
import type { CatalogEntry, FurnitureType } from "./room";

export const ikeaUrlSchema = z.string().trim().max(2048).url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "www.ikea.com" && !url.username && !url.password && !url.port && /^\/[a-z]{2}\/en\/p\/[^/]+\/$/.test(url.pathname);
}, "Use a full English-language IKEA product link.");

export interface ImportedProduct extends CatalogEntry {
  sourceUrl: string;
  dimensionSource: string;
  missingDimensions: string[];
}

function numberValue(raw: string): number {
  const normalized = raw.replace(/¼/g, " 1/4").replace(/½/g, " 1/2").replace(/¾/g, " 3/4").trim();
  return normalized.split(/\s+/).reduce((sum, token) => {
    if (token.includes("/")) {
      const [a, b] = token.split("/").map(Number);
      return sum + (a && b ? a / b : 0);
    }
    return sum + Number(token.replace(",", "."));
  }, 0);
}

export function parseIkeaProduct(markdown: string, sourceUrl: string): ImportedProduct {
  ikeaUrlSchema.parse(sourceUrl);
  // Ignore component/package measurements: only read the assembled measurements section.
  const section = markdown.match(/(?:^|\n)(?:#{1,4}\s*|-\s*)Measurements\s*\n([\s\S]*?)(?=Packaging|This product comes as|\n#{1,4}\s|$)/i)?.[1];
  if (!section) throw new Error("IKEA did not provide readable assembled measurements for this item.");
  const missingDimensions: string[] = [];
  const read = (name: string) => {
    const match = section.match(new RegExp(`(?:^|\\n)\\s*(?:-\\s*)?(?:\\*\\*)?${name}\\s*[:*]*\\s*([0-9.,\\s/¼½¾]+)\\s*(cm|mm|m|inches|in|[\"″])`, "i"));
    if (!match?.[1] || !match[2]) { missingDimensions.push(name.toLowerCase()); return 0; }
    const value = numberValue(match[1]);
    const unit = match[2].toLowerCase();
    const meters = value * (unit === "cm" ? 0.01 : unit === "mm" ? 0.001 : unit === "m" ? 1 : 0.0254);
    if (!Number.isFinite(meters) || meters <= 0 || meters > 15) throw new Error("The product measurements could not be verified.");
    return Math.round(meters * 1000000) / 1000000;
  };
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.replace(/\[.*$/, "").trim() ?? "IKEA furniture";
  const label = title.replace(/(BESTÅ)(Storage)/, "$1 $2").replace(/(\d)(Chair|Sofa|Armchair)/g, "$1 $2").split(",")[0]?.trim().slice(0, 100) || "IKEA furniture";
  let type: FurnitureType;
  if (/storage combination|cabinet|sideboard|with doors/i.test(label)) type = "cabinet";
  else if (/bookcase|shelf|shelving/i.test(label)) type = "shelf";
  else if (/sofa/i.test(label)) type = "sofa";
  else if (/armchair|chair[ -]?bed|easy chair|lounge chair/i.test(label)) type = "armchair";
  else if (/coffee table|side table/i.test(label)) type = "coffeeTable";
  else if (/desk|table/i.test(label)) type = "desk";
  else throw new Error("This item’s furniture shape is not supported yet. Try a cabinet, bookcase, sofa, armchair, or table.");
  const color = /orange/i.test(title) ? "#ed702b" : /white stained oak|oak effect/i.test(title) ? "#d8cfb9" : /white/i.test(title) ? "#eeeae3" : /black/i.test(title) ? "#343432" : "#9d896f";
  return { label, type, w: read("Width"), d: read("Depth"), h: read("Height"), color, sourceUrl, missingDimensions, dimensionSource: section.trim().slice(0, 600) };
}