import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import { App } from "./pages/app/index.jsx";
import { Settings } from "./pages/settings/index.jsx";
import { SignIn } from "./pages/signin/index.jsx";
import { ConsolePage } from "./pages/console/index.jsx";
import { installGlobalErrorLogging } from "./diagnostics.js";

installGlobalErrorLogging();

const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/app" replace />,
    },
    {
        path: "/app",
        element: <App />,
    },
    {
        path: "/settings",
        element: <Settings />,
    },
    {
        path: "/signin",
        element: <SignIn />,
    },
    {
        path: "/console",
        element: <ConsolePage />,
    },
], {
    basename: import.meta.env.BASE_URL,
});

createRoot(document.getElementById("root")).render(
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
);