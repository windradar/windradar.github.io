import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const LIGHT_THEMES = ["light", "ebook"];

function readAppTheme(): "light" | "dark" {
  return LIGHT_THEMES.includes(document.documentElement.getAttribute("data-theme") ?? "") ? "light" : "dark";
}

// The app theme lives in <html data-theme> (ThemeSelector), not in a React context
function useAppTheme() {
  const [theme, setTheme] = useState(readAppTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readAppTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useAppTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { Toaster, toast };
