import React from "react";

interface ContentImageProps {
  src: string;
  alt: string;
  caption?: string;
  variant?: "full" | "inline" | "framed";
}

/**
 * Image block with pixel-art border frame and optional caption.
 * 'framed' adds a thick pixel border, 'full' stretches edge-to-edge.
 */
export const ContentImage: React.FC<ContentImageProps> = ({
  src,
  alt,
  caption,
  variant = "framed",
}) => {
  return (
    <figure className={`cb-image cb-image--${variant}`}>
      <div className="cb-image__frame">
        <img src={src} alt={alt} className="cb-image__img" />
      </div>
      {caption && (
        <figcaption className="cb-image__caption">{caption}</figcaption>
      )}
    </figure>
  );
};
