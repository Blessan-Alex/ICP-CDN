import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Globe, Shield, Cpu, Database, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';

const VersionBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { isLoggedIn } = useAuth();

  if (!isVisible) return null;

  const handleTryNow = () => {
    if (isLoggedIn) {
      window.location.href = '/upload';
    } else {
      // Trigger login - this will show the login modal
      const loginButton = document.querySelector('[aria-label="Login"]');
      if (loginButton) {
        loginButton.click();
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white py-3 px-4 shadow-md z-50"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left side - Version info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="font-bold text-base">CanisterDrop v2.0</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
                  MAJOR UPDATE
                </span>
              </div>
              
              {/* Feature highlights - more compact */}
              <div className="hidden lg:flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>HTTP Outcalls</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Globe className="w-3 h-3" />
                  <span>IPFS</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>LRU Cache</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Database className="w-3 h-3" />
                  <span>Canister to Canister</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-white/90 font-medium">+ more</span>
                  <span className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ 
                    behavior: 'smooth' 
                  });
                }}
              >
                Explore Features
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white text-orange-600 hover:bg-gray-100 px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200"
                onClick={handleTryNow}
              >
                {isLoggedIn ? 'Try Now' : 'Login & Try'}
              </motion.button>

              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsVisible(false)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors duration-200"
                aria-label="Close notification"
              >
                <X className="w-3 h-3" />
              </motion.button>
            </div>
          </div>

          {/* Minimal decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-1 left-1/4 w-1 h-1 bg-white/30 rounded-full animate-ping"></div>
            <div className="absolute bottom-1 right-1/3 w-0.5 h-0.5 bg-white/40 rounded-full animate-pulse"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VersionBanner;
