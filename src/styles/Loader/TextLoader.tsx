import React from "react";
import styled from "styled-components";
import { useTheme } from "@/hooks/useTheme";

interface TextLoaderProps {
  /** Static text shown before the rotating words */
  prefix?: string;
  /** Array of words to rotate through (5 items, first = last for seamless loop) */
  words?: string[];
}

/**
 * Animated text loader that cycles through different words.
 * Automatically syncs with dark/light theme.
 *
 * @example
 * <TextLoader prefix="loading" words={['charts', 'data', 'insights', 'reports', 'charts']} />
 */
const TextLoader: React.FC<TextLoaderProps> = ({
  prefix = "Loading",
  words = ["charts", "data", "insights", "reports", "charts"],
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  // Dynamic colors based on theme
  const bgColor = isDarkMode ? "#1e293b" : "#ffffff";
  const textColor = isDarkMode ? "rgb(148, 163, 184)" : "rgb(100, 116, 139)";

  return (
    <StyledWrapper
      $bgColor={bgColor}
      $textColor={textColor}
      $isDark={isDarkMode}
    >
      <div className="card">
        <div className="loader">
          <p>{prefix}</p>
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

interface StyledProps {
  $bgColor: string;
  $textColor: string;
  $isDark: boolean;
}

const StyledWrapper = styled.div<StyledProps>`
  .card {
    --bg-color: ${(props) => props.$bgColor};
    background-color: var(--bg-color);
    padding: 1rem 2rem;
    border-radius: 1.25rem;
    box-shadow: ${(props) =>
      props.$isDark
        ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)"
        : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)"};
  }

  .loader {
    color: ${(props) => props.$textColor};
    font-family: "Inter", "Poppins", sans-serif;
    font-weight: 500;
    font-size: 25px;
    box-sizing: content-box;
    height: 40px;
    padding: 10px 10px;
    display: flex;
    border-radius: 8px;
  }

  .loader p {
    margin: 0;
  }

  .words {
    overflow: hidden;
    position: relative;
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
    color: #956afa;
    animation: spin_4991 4s infinite;
  }

  @keyframes spin_4991 {
    10% {
      transform: translateY(-102%);
    }
    25% {
      transform: translateY(-100%);
    }
    35% {
      transform: translateY(-202%);
    }
    50% {
      transform: translateY(-200%);
    }
    60% {
      transform: translateY(-302%);
    }
    75% {
      transform: translateY(-300%);
    }
    85% {
      transform: translateY(-402%);
    }
    100% {
      transform: translateY(-400%);
    }
  }

  @media (max-width: 640px) {
    .card {
      padding: 0.75rem 1.5rem;
    }
    .loader {
      font-size: 18px;
      height: 30px;
    }
  }
`;

export default TextLoader;
