import { Menu, X, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    <nav
      className={`sticky top-0 z-50 py-0.5
        bg-white/30 dark:bg-neutral-900/30
        backdrop-blur-2xl
        border-b border-white/30 dark:border-neutral-800/60
        shadow-lg shadow-black/10
        transition-shadow duration-300
        ${scrolled ? "shadow-xl shadow-orange-900/10" : ""}
      `}
      aria-label="Main navigation"
    >
      <div className="container px-4 mx-auto relative lg:text-sm min-h-0">
        <div className="flex justify-between items-center min-h-0">
          <div className="flex items-center flex-shrink-0">
            <img src={logo} alt="Logo" className="h-20 w-20 rounded-full animate-spin-custom" />
            <span className="text-2xl sm:text-3xl font-bold tracking-tight ml-2">CanisterDrop</span>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <div className="flex items-center space-x-8">
              {navItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavClick(item.href, item.type)}
                  className={`transition-colors duration-200 cursor-pointer relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    isOnDashboard
                      ? "text-neutral-500 cursor-not-allowed opacity-50"
                      : "hover:text-orange-500"
                  }`}
                  disabled={isOnDashboard}
                  title={isOnDashboard ? "Logout to access home page sections" : item.label}
                  aria-label={item.label}
                  tabIndex={0}
                >
                  {item.label}
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 group-hover:w-full h-0.5 bg-orange-500 transition-all duration-300" />
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-neutral-600"></div>
            <button
              onClick={() => handleNavClick(dashboardNavItem.href, dashboardNavItem.type)}
              className={`py-2 px-4 rounded-lg font-medium transition-all duration-300 transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:scale-105 relative group ${
                isOnDashboard
                  ? "bg-orange-600 text-white cursor-default"
                  : "bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800"
              }`}
              aria-label={dashboardNavItem.label}
              tabIndex={0}
            >
              {dashboardNavItem.label}
            </button>
            <button
              onClick={handleAuthClick}
              className="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white py-2 px-4 rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label={isLoggedIn ? "Logout" : "Login"}
              tabIndex={0}
            >
              {isLoggedIn ? "Logout" : "Login"}
            </button>
          </div>
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <motion.button
              onClick={toggleNavbar}
              aria-label={mobileDrawerOpen ? "Close menu" : "Open menu"}
              className="p-2 rounded-full border border-neutral-700 bg-white/70 dark:bg-neutral-900 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              whileTap={{ scale: 0.85 }}
              tabIndex={0}
            >
              <AnimatePresence initial={false} mode="wait">
                {mobileDrawerOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <motion.div
              className="lg:hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavClick(item.href, item.type)}
                    className={`block px-3 py-2 text-base font-medium transition-colors duration-200 cursor-pointer relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      isOnDashboard
                        ? "text-neutral-500 cursor-not-allowed opacity-50"
                        : "hover:text-orange-500"
                    }`}
                    disabled={isOnDashboard}
                    title={isOnDashboard ? "Logout to access home page sections" : item.label}
                    aria-label={item.label}
                    tabIndex={0}
                  >
                    {item.label}
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 group-hover:w-full h-0.5 bg-orange-500 transition-all duration-300" />
                  </button>
                ))}
                <div className="border-t border-neutral-700 my-2"></div>
                <button
                  onClick={() => handleNavClick(dashboardNavItem.href, dashboardNavItem.type)}
                  className={`block w-full text-left px-3 py-2 text-base font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    isOnDashboard
                      ? "bg-orange-600 text-white cursor-default"
                      : "bg-gradient-to-r from-orange-500 to-orange-700"
                  }`}
                  aria-label={dashboardNavItem.label}
                  tabIndex={0}
                >
                  {dashboardNavItem.label}
                </button>
                <button
                  onClick={handleAuthClick}
                  className="block w-full text-left px-3 py-2 text-base font-medium border border-orange-500 text-orange-500 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  aria-label={isLoggedIn ? "Logout" : "Login"}
                  tabIndex={0}
                >
                  {isLoggedIn ? "Logout" : "Login"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;