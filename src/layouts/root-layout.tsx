import { Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Outlet />
    </div>
  );
}

export default RootLayout;
