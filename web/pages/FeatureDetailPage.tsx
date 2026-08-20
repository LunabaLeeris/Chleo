import React from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import ICON_MOUTH from "../../assets/mouth.png";

import SpeechFeatureContent from "../content-pages/SpeechFeatureContent";
import {
  ContentHeader,
  ContentCallout,
  ContentDivider,
} from "../components/content-blocks";

interface FeatureDetailPageProps {
  featureId: string;
  featureTitle: string;
  featureIcon: string;
  onBack: () => void;
}

/**
 * Detail page for a specific feature module.
 * Renders composable content blocks based on the featureId.
 */
export const FeatureDetailPage: React.FC<FeatureDetailPageProps> = ({
  featureId,
  featureTitle,
  featureIcon,
  onBack,
}) => {
  return (
    <div className="app-layout">
      <Header activeTab="blog" />

      <main className="page-container">
        {/* Back navigation */}
        <button
          type="button"
          className="feature-detail-back-btn action-btn"
          onClick={onBack}
        >
          ← Back to Features
        </button>

        {/* Feature detail content area */}
        <div className="feature-detail-page panel-section panel-bg-discussions">
          {featureId === "speech" ? (
            <SpeechFeatureContent icon={featureIcon} />
          ) : (
            <ComingSoonContent title={featureTitle} icon={featureIcon} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

/* =========================================================================
   Coming Soon Placeholder
   ========================================================================= */

const ComingSoonContent: React.FC<{ title: string; icon: string }> = ({
  title,
  icon,
}) => (
  <div className="feature-detail-blocks">
    <ContentHeader
      title={title}
      subtitle="This feature documentation is currently being written."
      icon={<img src={icon} alt={title} className="cb-header__icon-img" />}
      level={1}
      badge="Coming Soon"
    />

    <ContentDivider />

    <ContentCallout variant="note">
      The detailed breakdown for <strong>{title}</strong> is coming soon. Check
      back later for a full explanation of how this module works!
    </ContentCallout>
  </div>
);
