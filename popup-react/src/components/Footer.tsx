import React from 'react';

interface FooterProps {
  onOpenFullInterface: () => void;
}

function Footer({ onOpenFullInterface }: FooterProps) {
  return (
    <footer>
      <button id="openFullInterface" className="link-btn" onClick={onOpenFullInterface}>
        🎯 Full Interface
      </button>
    </footer>
  );
}

export default Footer;
