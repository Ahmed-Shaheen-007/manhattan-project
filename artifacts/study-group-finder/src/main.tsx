import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App.tsx";
import "./index.css";

// Configure API client
setAuthTokenGetter(() => localStorage.getItem("token"));
setBaseUrl(window.location.origin);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
