import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#2a1a10] text-amber-100">
      <h1 className="text-3xl font-bold">Wooden Chess</h1>
    </div>
  );
}
