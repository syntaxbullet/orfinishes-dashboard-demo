import "./index.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { RootLayout } from "./layouts/root-layout";
import { DashboardPage } from "./pages/dashboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
