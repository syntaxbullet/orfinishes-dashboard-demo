import "./index.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./contexts/auth-context";
import { DataProvider } from "./providers/data-provider";
import { RootLayout } from "./layouts/root-layout";
import { DashboardPage } from "./pages/dashboard";
import { CatalogPage } from "./pages/catalog";
import { EventsPage } from "./pages/events";
import { ItemsPage } from "./pages/items";
import { LogEventPage } from "./pages/log-event";
import { PlayersPage } from "./pages/players";

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
        path: "items",
        element: <ItemsPage />,
      },
      {
        path: "events",
        element: <EventsPage />,
      },
      {
        path: "events/log",
        element: <LogEventPage />,
      },
      {
        path: "players",
        element: <PlayersPage />,
      },
    ],
  },
]);

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <RouterProvider router={router} />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
