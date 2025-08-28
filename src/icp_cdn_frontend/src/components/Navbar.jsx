import { Menu, X, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/logo.png";
import { navItems, enhancedNavItems } from "../constants";
import { IoIosArrowDown } from "react-icons/io";
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
        navigate('/upload');
      } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
      }
    }
  };

  const handleNavClick = (href, type) => {
    if (type === "scroll") {
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

      const isOnUpload = location.pathname === '/upload';

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
              {/* Home first */}
              {navItems.filter(n => n.label === "Home").map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavClick(item.href, item.type)}
                  className="transition-colors duration-200 cursor-pointer relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:text-orange-500"
                  aria-label={item.label}
                  tabIndex={0}
                >
                  {item.label}
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 group-hover:w-full h-0.5 bg-orange-500 transition-all duration-300" />
                </button>
              ))}
              {/* Features dropdown second */}
              <div className="relative group">
                <button
                  onClick={() => handleNavClick('#features', 'scroll')}
                  className="transition-colors duration-200 cursor-pointer relative flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:text-orange-500"
                  aria-haspopup="true"
                  aria-expanded="false"
                  aria-label="Features"
                  tabIndex={0}
                >
                  <span>Features</span>
                  <IoIosArrowDown className="inline ml-1 w-4 h-4 transform transition-transform duration-200 group-hover:rotate-180" />
                </button>
                <div className="absolute left-0 mt-2 w-56 rounded-md border border-neutral-700 bg-neutral-900 text-white shadow-lg hidden group-hover:block z-50">
                  <div className="py-3">
                    {enhancedNavItems.map((subItem, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => handleNavClick(subItem.href, subItem.type)}
                        className="block w-full text-left px-5 py-3 text-sm hover:bg-neutral-800 focus:outline-none transition-colors duration-200"
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Remaining nav items after Features */}
              {navItems.filter(n => n.label !== "Home" && n.label !== "Features").map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavClick(item.href, item.type)}
                  className="transition-colors duration-200 cursor-pointer relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:text-orange-500"
                  aria-label={item.label}
                  tabIndex={0}
                >
                  {item.label}
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 group-hover:w-full h-0.5 bg-orange-500 transition-all duration-300" />
                </button>
              ))}
            </div>
            
            {/* Upload button - Always show, but handle login if not authenticated */}
            <button
              onClick={() => {
                if (isLoggedIn) {
                  handleNavClick("/upload", "page");
                } else {
                  // Show login prompt
                  handleAuthClick();
                }
              }}
              className={`py-2 px-4 rounded-lg font-medium transition-all duration-300 transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:scale-105 relative group ${
                isOnUpload
                  ? "bg-orange-600 text-white cursor-default"
                  : "bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800"
              }`}
              aria-label="Upload"
              tabIndex={0}
            >
              Upload
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
                {/* Home, About, Mission shown always; Features becomes a dropdown section */}
                {navItems.filter(n => n.label !== 'Features').map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavClick(item.href, item.type)}
                    className="block px-3 py-2 text-base font-medium transition-colors duration-200 cursor-pointer relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:text-orange-500"
                    aria-label={item.label}
                    tabIndex={0}
                  >
                    {item.label}
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 group-hover:w-full h-0.5 bg-orange-500 transition-all duration-300" />
                  </button>
                ))}
                {/* Mobile Features list */}
                <div className="border-t border-neutral-700 my-2"></div>
                <div className="px-3 py-1 text-xs font-semibold text-orange-400 uppercase tracking-wider">Features</div>
                {enhancedNavItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavClick(item.href, item.type)}
                    className="block px-3 py-2 text-base font-medium transition-colors duration-200 cursor-pointer relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 hover:text-orange-500"
                    aria-label={item.label}
                    tabIndex={0}
                  >
                    {item.label}
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 group-hover:w-full h-0.5 bg-orange-500 transition-all duration-300" />
                  </button>
                ))}
                
                
                
                {/* Upload button - Always show, but handle login if not authenticated */}
                <div className="border-t border-neutral-700 my-2"></div>
                <button
                  onClick={() => {
                    if (isLoggedIn) {
                      handleNavClick("/upload", "page");
                    } else {
                      // Show login prompt
                      handleAuthClick();
                    }
                  }}
                  className={`block w-full text-left px-3 py-2 text-base font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    isOnUpload
                      ? "bg-orange-600 text-white cursor-default"
                      : "bg-gradient-to-r from-orange-500 to-orange-700"
                  }`}
                  aria-label="Upload"
                  tabIndex={0}
                >
                  Upload
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