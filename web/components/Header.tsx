import React from "react";
import { Button, Badge } from "./ui";

interface HeaderProps {
  activeTab: "home" | "playground" | "editor" | "marketplace" | "blog";
  theme?: "cream" | "grid";
  onThemeChange?: (theme: "cream" | "grid") => void;
  onToggleDrawer?: () => void;
}

// Renders the main application header with navigation tabs and control buttons.
export const Header: React.FC<HeaderProps> = ({
  activeTab,
  theme = "cream",
  onThemeChange,
  onToggleDrawer,
}) => {
  return (
    <header className="app-header panel-bg-header">
      <a
        href="./index.html"
        className="brand"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className="brand-avatar-icon">
          <img src="/logo.png" alt="CHLEO Logo" className="brand-logo-img" />
        </div>
        <h1 className="brand-title">
          CHLEO{" "}
          <span className="pixel-tag">
            {activeTab === "home"
              ? "Home"
              : activeTab === "playground"
                ? "Playground"
                : activeTab === "editor"
                  ? "Editor"
                  : activeTab === "marketplace"
                    ? "Marketplace"
                    : "Features"}
          </span>
        </h1>
      </a>

      <nav className="app-nav-tabs">
        <a
          href="./index.html"
          className={`nav-tab ${activeTab === "home" ? "active" : ""}`}
        >
          Home
        </a>
        <a
          href="./playground.html"
          className={`nav-tab ${activeTab === "playground" ? "active" : ""}`}
        >
          Playground
        </a>
        <a
          href="./editor.html"
          className={`nav-tab ${activeTab === "editor" ? "active" : ""}`}
        >
          Editor
        </a>
        <a
          href="./marketplace.html"
          className={`nav-tab ${activeTab === "marketplace" ? "active" : "disabled-tab"}`}
        >
          Marketplace <Badge variant="nav">Dev</Badge>
        </a>
        <a
          href="./blog.html"
          className={`nav-tab ${activeTab === "blog" ? "active" : ""}`}
        >
          Features <Badge variant="nav">Dev</Badge>
        </a>
      </nav>

      <div className="header-actions">
        <a
          href="https://github.com/LunabaLeeris/Chleo"
          target="_blank"
          rel="noopener noreferrer"
          className="contribute-btn"
          title="Contribute on GitHub"
        >
          Contribute
        </a>

        {activeTab === "playground" && onToggleDrawer && (
          <Button
            id="btn-toggle-drawer"
            variant="drawer-toggle"
            title="Open Controls Sidebar"
            onClick={onToggleDrawer}
          >
            Controls
          </Button>
        )}
      </div>
    </header>
  );
};
