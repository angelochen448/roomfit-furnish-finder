import { createFileRoute } from "@tanstack/react-router";
import { RoomPlanner } from "@/components/room/RoomPlanner";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nestwise — Room studio" },
      { name: "description", content: "Upload a photo of your room and place true-to-size 3D furniture to see what fits." },
      { property: "og:title", content: "Nestwise — Room studio" },
      { property: "og:description", content: "Place true-to-size 3D furniture in a photo of your room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomPlanner,
});
