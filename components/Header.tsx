
import React, { useState, useEffect } from 'react';
import { MOCK_USER } from '../constants';
import { MenuIcon, SearchIcon, BellIcon, CloseIcon } from './Icons';

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isSidebarOpen = false }) => {
  // Track if mobile to show appropriate icon
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // On mobile, show close icon when sidebar is open, menu icon when closed
  const showCloseIcon = isMobile && isSidebarOpen;
  
  return (
    <header className="flex-shrink-0 bg-white shadow-sm fixed top-0 left-0 right-0 z-[250]">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <button onClick={onMenuClick} className="text-gray-500 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary">
          {showCloseIcon ? (
            <CloseIcon className="h-6 w-6" />
          ) : (
            <MenuIcon className="h-6 w-6" />
          )}
        </button>

        <div className="flex-1 ml-4 md:ml-6">
          <div className="relative text-gray-400 focus-within:text-gray-600">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              className="block w-full h-10 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              placeholder="Search subjects, simulations..."
              type="search"
            />
          </div>
        </div>

        <div className="ml-4 flex items-center md:ml-6">
          <button className="p-1 rounded-full text-gray-400 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
            <BellIcon className="h-6 w-6" />
          </button>

          <div className="ml-3 relative">
            <div>
              <button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                <img className="h-8 w-8 rounded-full" src={MOCK_USER.avatarUrl} alt={MOCK_USER.name} />
              </button>
            </div>
          </div>
          <span className="hidden sm:block ml-3 text-sm font-medium text-brand-dark">{MOCK_USER.name}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
