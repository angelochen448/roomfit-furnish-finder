import { createServerFn } from "@tanstack/react-start";
import { photoInputSchema } from "./measurement-photo";

export const importMeasurementPhotos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => photoInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { product: null, error: "Photo reading is not connected." };
    const { readMeasurementPhotos } = await import("./measurement-photo.server");
    return readMeasurementPhotos(data, key);
  });