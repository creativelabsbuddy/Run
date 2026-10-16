import { createFileRoute } from "@tanstack/react-router";
import { BuilderScreen } from "@/components/builder-screen";

export const Route = createFileRoute("/build")({
  component: BuilderScreen,
});
