import { Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "../assets/logo.png";
import { navItems, dashboardNavItem } from "../constants";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { login, logout } from "../auth";

const Navbar = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { isLoggedIn, logout: handleLogout, forceCheckAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleNavbar = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleAuthClick = async () => {
    if (isLoggedIn) {
      try {
        await handleLogout();
        await forceCheckAuth();
        navigate('/');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    } else {
      try {
        await login();
        await forceCheckAuth();
        navigate('/dashboard');
      } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
      }
    }
  };

  const handleNavClick = (href, type) => {
    if (type === "scroll") {
      // If on dashboard, show message that they need to logout first
      if (location.pathname === '/dashboard') {
        alert('Please logout first to access the home page sections.');
        return;
      }
      // Smooth scroll to section
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (type === "page") {
      // Regular navigation
      navigate(href);
    }
    setMobileDrawerOpen(false);
  };

  const isOnDashboard = location.pathname === '/dashboard';

  return (
    <nav className="sticky top-0 z-50 py-1 backdrop-blur-lg border-b border-neutral-700/80">
      <div className="container px-4 mx-auto relative lg:text-sm min-h-0">
        <div className="flex justify-between items-center min-h-0">
          <div className="flex items-center flex-shrink-0">
            <img src={logo} alt="Logo" className="h-20 w-20 rounded-full animate-spin-custom" />
            <span className="text-xl tracking-tight">CanisterDrop</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {/* Home Page Links Group */}
            <div className="flex items-center space-x-8">
              {navItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavClick(item.href, item.type)}
                  className={`transition-colors duration-200 cursor-pointer ${
                    isOnDashboard 
                      ? 'text-neutral-500 cursor-not-allowed opacity-50' 
                      : 'hover:text-orange-500'
                  }`}
                  disabled={isOnDashboard}
                  title={isOnDashboard ? 'Logout to access home page sections' : item.label}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            {/* Separator */}
            <div className="w-px h-6 bg-neutral-600"></div>
            
            {/* Dashboard Link - Unique Styling */}
            <button
              onClick={() => handleNavClick(dashboardNavItem.href, dashboardNavItem.type)}
              className={`py-2 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                isOnDashboard
                  ? 'bg-orange-600 text-white cursor-default'
                  : 'bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800'
              }`}
            >
              {dashboardNavItem.label}
            </button>
            
            {/* Auth Button */}
            <button
              onClick={handleAuthClick}
              className="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white py-2 px-4 rounded-lg transition-all duration-300"
            >
              {isLoggedIn ? 'Logout' : 'Login'}
            </button>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button onClick={toggleNavbar}>
              {mobileDrawerOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileDrawerOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Home Page Links */}
              {navItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavClick(item.href, item.type)}
                  className={`block px-3 py-2 text-base font-medium transition-colors duration-200 cursor-pointer ${
                    isOnDashboard 
                      ? 'text-neutral-500 cursor-not-allowed opacity-50' 
                      : 'hover:text-orange-500'
                  }`}
                  disabled={isOnDashboard}
                  title={isOnDashboard ? 'Logout to access home page sections' : item.label}
                >
                  {item.label}
                </button>
              ))}
              
              {/* Separator */}
              <div className="border-t border-neutral-700 my-2"></div>
              
              {/* Dashboard Link */}
              <button
                onClick={() => handleNavClick(dashboardNavItem.href, dashboardNavItem.type)}
                className={`block w-full text-left px-3 py-2 text-base font-medium rounded-lg ${
                  isOnDashboard
                    ? 'bg-orange-600 text-white cursor-default'
                    : 'bg-gradient-to-r from-orange-500 to-orange-700'
                }`}
              >
                {dashboardNavItem.label}
              </button>
              
              {/* Auth Button */}
              <button
                onClick={handleAuthClick}
                className="block w-full text-left px-3 py-2 text-base font-medium border border-orange-500 text-orange-500 rounded-lg"
              >
                {isLoggedIn ? 'Logout' : 'Login'}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;