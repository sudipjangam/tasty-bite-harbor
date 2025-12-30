import React from "react";
import styled, { keyframes } from "styled-components";
import { useTheme } from "@/hooks/useTheme";
import SwadeshiLogoImage from "@/assets/swadeshi-logo.png";

interface SwadeshiLoaderProps {
  /** Text to show while loading */
  loadingText?: string;
  /** Words to rotate through */
  words?: string[];
  /** Size of the logo */
  size?: number;
}

/**
 * Swadeshi Solutions Branded Loader
 * Features the logo with rotating text below.
 * Perfect for full-page loading states.
 */
const SwadeshiLoader: React.FC<SwadeshiLoaderProps> = ({
  loadingText = "loading",
  words = [
    "solutions",
    "innovations",
    "possibilities",
    "experiences",
    "solutions",
  ],
  size = 120,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const bgColor = isDark ? "#1e293b" : "#ffffff";
  const textColor = isDark ? "rgb(148, 163, 184)" : "rgb(100, 116, 139)";

  return (
    <StyledWrapper $bgColor={bgColor} $textColor={textColor} $isDark={isDark}>
      {/* Swadeshi Solutions Logo Image */}
      <img
        src={SwadeshiLogoImage}
        alt="Swadeshi Solutions"
        className="logo-image"
        style={{ width: size, height: "auto" }}
      />

      {/* Text Loader with rotating words */}
      <div className="text-loader-card">
        <div className="text-loader">
          <p>{loadingText}</p>
          <div className="words">
            {words.map((word, index) => (
              <span key={index} className="word">
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

// Keyframes for rotating words
const spin = keyframes`
  10% { transform: translateY(-102%); }
  25% { transform: translateY(-100%); }
  35% { transform: translateY(-202%); }
  50% { transform: translateY(-200%); }
  60% { transform: translateY(-302%); }
  75% { transform: translateY(-300%); }
  85% { transform: translateY(-402%); }
  100% { transform: translateY(-400%); }
`;

interface StyledProps {
  $bgColor: string;
  $textColor: string;
  $isDark: boolean;
}

const StyledWrapper = styled.div<StyledProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;

  .logo-image {
    object-fit: contain;
  }

  .text-loader-card {
    --bg-color: ${(props) => props.$bgColor};
    background-color: var(--bg-color);
    padding: 1rem 2rem;
    border-radius: 1.25rem;
    box-shadow: ${(props) =>
      props.$isDark
        ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)"
        : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)"};
  }

  .text-loader {
    color: ${(props) => props.$textColor};
    font-family: "Inter", "Poppins", sans-serif;
    font-weight: 500;
    font-size: 22px;
    box-sizing: content-box;
    height: 36px;
    padding: 8px 8px;
    display: flex;
    align-items: center;
    border-radius: 8px;
  }

  .text-loader p {
    margin: 0;
  }

  .words {
    overflow: hidden;
    position: relative;
    height: 36px;
  }

  .words::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      var(--bg-color) 10%,
      transparent 30%,
      transparent 70%,
      var(--bg-color) 90%
    );
    z-index: 20;
  }

  .word {
    display: block;
    height: 100%;
    padding-left: 6px;
    color: #f26722;
    font-weight: 600;
    animation: ${spin} 4s infinite;
  }

  @media (max-width: 640px) {
    .text-loader-card {
      padding: 0.75rem 1.5rem;
    }
    .text-loader {
      font-size: 16px;
      height: 28px;
    }
    .words {
      height: 28px;
    }
  }
`;

export default SwadeshiLoader;
