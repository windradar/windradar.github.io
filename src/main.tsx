import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
// Must run before the browser fires beforeinstallprompt
import "./lib/install-prompt";

// Apply the saved theme before the first render: ThemeSelector only mounts on the
// home page, so opening /map or /help directly used to fall back to dark
try {
  const theme = localStorage.getItem("windradar_theme");
  if (theme === "light" || theme === "ebook" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  }
} catch {
  // storage unavailable: keep the default theme
}

createRoot(document.getElementById("root")!).render(<App />);
