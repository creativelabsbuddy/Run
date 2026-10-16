import { createFileRoute } from "@tanstack/react-router";
import { EditorScreen } from "@/components/editor-screen";

export const Route = createFileRoute("/p/$id")({
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  return <EditorScreen projectId={id} />;
}
