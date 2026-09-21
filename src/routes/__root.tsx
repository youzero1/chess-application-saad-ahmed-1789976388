import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

// The app shell: anything rendered here (nav, footer, providers) appears on every page.
// <Outlet /> is where the matched page renders.
function RootLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#10455c_0%,#0a2f3a_55%,#051e26_100%)] text-teal-50">
      <Outlet />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a2226] text-teal-100">
      <p className="text-lg">This page does not exist.</p>
      <Link to="/" className="text-sm text-accent underline underline-offset-4">
        Go to the home page
      </Link>
    </div>
  );
}
