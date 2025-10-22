import "./index.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ThemeProvider } from "./components/theme-provider";
import { RootLayout } from "./layouts/root-layout";
import { DashboardPage } from "./pages/dashboard";
import { CatalogPage } from "./pages/catalog";
import { EventsPage } from "./pages/events";
import { PlayersPage } from "./pages/players";
import { SettingsPage } from "./pages/settings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "catalog",
        element: <CatalogPage />,
      },
      {
        path: "events",
        element: <EventsPage />,
      },
      {
        path: "players",
        element: <PlayersPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
