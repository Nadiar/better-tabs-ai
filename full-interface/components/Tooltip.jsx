import React, { useState, useRef, useEffect } from 'react';

// Tooltip Component - Shows full tab title and URL on hover
function Tooltip({ children, tab }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = (e) => {
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

  const hideTooltip = () => {
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

  if (!tab) return children;

  const truncate = (str, maxLength) => {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

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
