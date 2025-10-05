import React from 'react';

interface FooterProps {
  onOpenFullInterface: () => void;
  onOpenSettings: () => void;
}

function Footer({ onOpenFullInterface, onOpenSettings }: FooterProps) {
  return (
    <footer>
      <button id="openFullInterface" className="link-btn" onClick={onOpenFullInterface}>
        🎯 Full Interface
      </button>
      <button id="settingsBtn" className="link-btn" onClick={onOpenSettings}>
        ⚙️ Settings
      </button>
    </footer>
  );
}

export default Footer;
