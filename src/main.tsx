import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
// Must run before the browser fires beforeinstallprompt
import "./lib/install-prompt";

createRoot(document.getElementById("root")!).render(<App />);
