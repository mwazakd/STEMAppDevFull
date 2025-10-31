import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer bg-brand-dark text-white py-16 px-6">
      <div className="footer-content max-w-7xl mx-auto">
        <div className="footer-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div className="footer-section">
            <h4 className="text-lg font-bold mb-4">🔬 STEM Lab</h4>
            <p className="text-gray-400 text-sm">
              Making science education accessible through interactive simulations.
            </p>
          </div>
          <FooterLinkSection title="Subjects">
            <a href="#">Chemistry</a>
            <a href="#">Physics</a>
            <a href="#">Biology</a>
            <a href="#">Mathematics</a>
          </FooterLinkSection>
          <FooterLinkSection title="Resources">
            <a href="#">Study Guides</a>
            <a href="#">Teacher Tools</a>
            <a href="#">Blog</a>
            <a href="#">Community</a>
          </FooterLinkSection>
          <FooterLinkSection title="Company">
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Contact</a>
            <a href="#">Privacy Policy</a>
          </FooterLinkSection>
        </div>
        <div className="footer-bottom border-t border-gray-700 pt-6 text-center text-gray-500 text-sm">
          <p>© 2025 STEM Lab. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

const FooterLinkSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="footer-section">
        <h4 className="text-base font-bold mb-4">{title}</h4>
        <ul className="space-y-3">
            {/* FIX: The original code produced a type error and would cause a runtime error
                by trying to clone non-element children (like whitespace text nodes).
                By checking `React.isValidElement`, we ensure we only clone actual elements. */}
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return (
                        <li>
                            {React.cloneElement(child, { className: "text-gray-400 text-sm hover:text-white transition-colors" })}
                        </li>
                    );
                }
                return null;
            })}
        </ul>
    </div>
);

export default Footer;
