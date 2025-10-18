import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { TabData } from '@shared';
import { truncate } from '../utils/tab-helpers';

interface TooltipProps {
  children: ReactNode;
  tab?: TabData;
}

interface Position {
  top: number;
  left: number;
}

// Tooltip Component - Shows full tab title and URL on hover
function Tooltip({ children, tab }: TooltipProps): JSX.Element {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = (e: React.MouseEvent): void => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show tooltip after 500ms delay
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        // Position above the tab card
        let top = triggerRect.top - tooltipRect.height - 8;
        let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

        // Keep tooltip within viewport
        if (left < 8) left = 8;
        if (left + tooltipRect.width > window.innerWidth - 8) {
          left = window.innerWidth - tooltipRect.width - 8;
        }
        if (top < 8) {
          // If not enough space above, show below instead
          top = triggerRect.bottom + 8;
        }

        setPosition({ top, left });
        setIsVisible(true);
      }
    }, 500);
  };

  const hideTooltip = (): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!tab) return <>{children}</>;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="tab-tooltip"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 10000
          }}
        >
          <div className="tooltip-title">{truncate(tab.title, 60)}</div>
          <div className="tooltip-url">{truncate(tab.url, 80)}</div>
        </div>
      )}
    </>
  );
}

export default Tooltip;
