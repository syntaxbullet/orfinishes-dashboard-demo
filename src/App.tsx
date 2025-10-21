import "./index.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ThemeProvider } from "./components/theme-provider";
import { AnalyticsPage } from "./pages/analytics";
import { CustomersPage } from "./pages/customers";
import { RootLayout } from "./layouts/root-layout";
import { DashboardPage } from "./pages/dashboard";
import { ReportsPage } from "./pages/reports";
import { SalesPage } from "./pages/sales";
import { SettingsPage } from "./pages/settings";
import { SupportPage } from "./pages/support";

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
        path: "analytics",
        element: <AnalyticsPage />,
      },
      {
        path: "customers",
        element: <CustomersPage />,
      },
      {
        path: "sales",
        element: <SalesPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "support",
        element: <SupportPage />,
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
