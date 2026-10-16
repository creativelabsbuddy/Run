import { createFileRoute } from "@tanstack/react-router";
import { Marketplace } from "@/components/marketplace";

export const Route = createFileRoute("/")({
  component: Marketplace,
});
