import { createServerFn } from "@tanstack/react-start";
import { roomPhotoInputSchema } from "./room-photo";

export const analyzeRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => roomPhotoInputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { analysis: null, error: "Room analysis is not connected." };
    const { analyzeRoomPhoto } = await import("./room-photo.server");
    return analyzeRoomPhoto(data.image, key);
  });