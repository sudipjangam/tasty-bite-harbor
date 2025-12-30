import React from "react";
import styled, { keyframes, css } from "styled-components";
import { useTheme } from "@/hooks/useTheme";

interface SwadeshiLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  showText?: boolean;
  animated?: boolean;
  variant?: "full" | "icon" | "loader";
}

/**
 * Swadeshi Solutions Logo - Accurate Interlocking S Design
 * Two capsule-style S shapes weaving over and under each other.
 *
 * Weaving Pattern:
 * - Top intersection: Blue goes OVER Orange
 * - Bottom intersection: Orange goes OVER Blue
 *
 * Animation:
 * - Gentle pulsing breath effect
 * - Subtle counter-rotation of the two S shapes
 */
const SwadeshiLogo: React.FC<SwadeshiLogoProps> = ({
  className = "",
  width = 200,
  height = "auto",
  showText = true,
  animated = false,
  variant = "full",
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Brand Colors
  const orange = "#F26722";
  const blue = "#2E3192";
  const textColor = isDark ? "#F8FAFC" : "#2E3192";

  const getViewBox = () => {
    if (variant === "icon" || variant === "loader") return "0 0 100 115";
    if (showText) return "0 0 320 115";
    return "0 0 100 115";
  };

  const isAnimated = variant === "loader" || animated;

  return (
    <StyledWrapper $animated={isAnimated}>
      <svg
        width={width}
        height={height}
        viewBox={getViewBox()}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="Swadeshi Solutions Logo"
      >
        {/* Logo Icon */}
        <g className="logo-icon">
          {/* === LAYER 1: ORANGE S (Bottom layer at TOP intersection) === */}
          <g className="s-orange">
            {/* Orange full S path */}
            <path
              d="M30 8 
                 C10 8 2 22 5 38 
                 C8 52 22 58 42 54 
                 C52 52 60 54 64 62
                 C70 74 68 94 52 104 
                 C38 112 18 110 10 100"
              stroke={orange}
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* === LAYER 2: BLUE S (Full path) === */}
          <g className="s-blue">
            {/* Blue full S path */}
            <path
              d="M70 8 
                 C90 8 98 22 95 38 
                 C92 52 78 58 58 54 
                 C48 52 40 54 36 62
                 C30 74 32 94 48 104 
                 C62 112 82 110 90 100"
              stroke={blue}
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* === LAYER 3: ORANGE overlay at BOTTOM (Orange over Blue at bottom) === */}
          <g className="s-orange-over">
            <path
              d="M58 58 
                 C64 64 68 76 60 90
                 C52 102 38 108 22 104"
              stroke={orange}
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* === LAYER 4: BLUE overlay at TOP (Blue over Orange at top) === */}
          <g className="s-blue-over">
            <path
              d="M70 8 
                 C88 8 96 20 94 34
                 C92 46 82 54 66 54"
              stroke={blue}
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </g>

        {/* Text Section */}
        {variant === "full" && showText && (
          <g transform="translate(115, 30)">
            <text
              x="0"
              y="28"
              fontFamily="'Inter', 'Poppins', Arial, sans-serif"
              fontWeight="800"
              fontSize="32"
              fill={textColor}
              letterSpacing="2"
            >
              SWADESHI
            </text>
            <text
              x="0"
              y="65"
              fontFamily="'Inter', 'Poppins', Arial, sans-serif"
              fontWeight="800"
              fontSize="32"
              fill={textColor}
              letterSpacing="2"
            >
              SOLUTIONS
            </text>
          </g>
        )}
      </svg>

      {variant === "loader" && <p className="loading-text">Loading...</p>}
    </StyledWrapper>
  );
};

// Animation keyframes
const breathe = keyframes`
  0%, 100% { 
    transform: scale(1); 
  }
  50% { 
    transform: scale(1.03); 
  }
`;

const gentleSwayOrange = keyframes`
  0%, 100% { transform: rotate(0deg) translateX(0); }
  25% { transform: rotate(3deg) translateX(1px); }
  75% { transform: rotate(-3deg) translateX(-1px); }
`;

const gentleSwayBlue = keyframes`
  0%, 100% { transform: rotate(0deg) translateX(0); }
  25% { transform: rotate(-3deg) translateX(-1px); }
  75% { transform: rotate(3deg) translateX(1px); }
`;

const fadeText = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

interface StyledProps {
  $animated: boolean;
}

const StyledWrapper = styled.div<StyledProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .logo-icon {
    transform-origin: 50px 57px;
    ${(props) =>
      props.$animated &&
      css`
        animation: ${breathe} 2s ease-in-out infinite;
      `}
  }

  .s-orange,
  .s-orange-over {
    transform-origin: 35px 57px;
    ${(props) =>
      props.$animated &&
      css`
        animation: ${gentleSwayOrange} 2.5s ease-in-out infinite;
      `}
  }

  .s-blue,
  .s-blue-over {
    transform-origin: 65px 57px;
    ${(props) =>
      props.$animated &&
      css`
        animation: ${gentleSwayBlue} 2.5s ease-in-out infinite;
      `}
  }

  .loading-text {
    margin: 0;
    font-family: "Inter", "Poppins", sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    letter-spacing: 1px;
    ${(props) =>
      props.$animated &&
      css`
        animation: ${fadeText} 1.5s ease-in-out infinite;
      `}
  }
`;

export default SwadeshiLogo;
