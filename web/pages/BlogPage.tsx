import React, { useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { FeatureModuleCard } from "../components/FeatureModuleCard";
import { FeatureDetailPage } from "./FeatureDetailPage";

// Icons from root assets folder
import ICON_BRAIN from "../../assets/brain.png";
import ICON_EYES from "../../assets/eyes.png";
import ICON_MOUTH from "../../assets/mouth.png";
import ICON_HEART from "../../assets/heart.png";

interface FeatureCardData {
  id: string;
  title: string;
  description: string;
  icon: string;
  locked: boolean;
}

const FEATURE_PANELS: FeatureCardData[] = [
  {
    id: "intelligence",
    title: "Intelligence",
    description:
      "Various behaviors and customizable rules powered by LLMs for realism.",
    icon: ICON_BRAIN,
    locked: true,
  },
  {
    id: "monitoring",
    title: "Monitoring",
    description: "Monitors your activity and guides you to be productive.",
    icon: ICON_EYES,
    locked: true,
  },
  {
    id: "speech",
    title: "Speech",
    description: "Nuanced and realistic speech animation by using visemes.",
    icon: ICON_MOUTH,
    locked: false,
  },
  {
    id: "emotions",
    title: "Emotions",
    description: "Have various emotions using Plutchik's wheel.",
    icon: ICON_HEART,
    locked: true,
  },
];

export const BlogPage: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  // If a feature is selected, render its detail page
  if (activeFeature) {
    const panel = FEATURE_PANELS.find((p) => p.id === activeFeature);
    if (panel) {
      return (
        <FeatureDetailPage
          featureId={panel.id}
          featureTitle={panel.title}
          featureIcon={panel.icon}
          onBack={() => setActiveFeature(null)}
        />
      );
    }
  }

  // Grid view — show all feature cards
  return (
    <div className="app-layout">
      <Header activeTab="blog" />

      <main className="page-container">
        {/* Page Banner */}
        <section className="features-banner-section panel-section panel-bg-discussions">
          <div className="features-banner-content">
            <h2 className="banner-title">CHLEO Features</h2>
            <p className="banner-subtitle">
              Here are chleo's capabilities. Here's a complete breakdown and
              discussion on how each feature works! Enjoy creating and I hope
              you'll add more features to her to make her more realistic! Feel
              free to contact me for clarifications, additions or changes you
              want to incorporate.
            </p>
          </div>
        </section>

        {/* 4 Feature Panels (Cards Grid) */}
        <section className="features-grid-section">
          <h3 className="section-subtitle">Companion Modules</h3>

          <div className="features-cards-grid">
            {FEATURE_PANELS.map((panel) => (
              <FeatureModuleCard
                key={panel.id}
                id={panel.id}
                title={panel.title}
                description={panel.description}
                icon={panel.icon}
                locked={panel.locked}
                onClick={() => setActiveFeature(panel.id)}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
