import { useAuth } from "../AuthContext";
import { login } from "../auth";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Shield, Globe } from "lucide-react";
import undrawUpload from "../assets/undraw_files-uploading_qf8u (1).svg";
import undrawShare from "../assets/undraw_share-link_jr6w.svg";
import undrawStars from "../assets/undraw_to-the-stars_tz9v.svg";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import biofield from "../assets/Biofield.json";

const HeroSection = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleDeployNow = async () => {
    if (isLoggedIn) {
      // If already logged in, go directly to dashboard
      navigate('/dashboard');
    } else {
      // If not logged in, start authentication flow
      try {
        await login();
        // After successful login, navigate to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
      }
    }
  };

  const stats = [
    { icon: <Zap className="w-6 h-6" />, value: "99.9%", label: "Uptime" },
    { icon: <Shield className="w-6 h-6" />, value: "100%", label: "Secure" },
    { icon: <Globe className="w-6 h-6" />, value: "Global", label: "Network" },
  ];

  return (
    <div className="relative overflow-hidden w-full min-h-screen">
      {/* Lottie Gradient Animation */}
      <Lottie
        animationData={biofield}
        loop
        autoplay
        className="absolute left-1/2 top-20 w-[700px] h-[700px] -translate-x-1/2 -translate-y-1/4 opacity-40 pointer-events-none select-none z-0 mix-blend-lighten"
        aria-hidden="true"
        style={{ maxWidth: "80vw", maxHeight: "60vh", opacity: 0.4 }}
      />
      {/* Background Gradient - Extended to sides */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-800/10 z-0"></div>
      
      {/* Main Content */}
      <div className="relative z-10 text-center py-20 max-w-7xl mx-auto px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="inline-flex items-center px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-8"
        >
          <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
          Powered by Internet Computer Protocol
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-8"
        >
          Fast, Secure,{" "}
          <span className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-transparent bg-clip-text">
            Decentralized
          </span>{" "}
          CDN
        </motion.h1>
        
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-2xl sm:text-3xl lg:text-4xl text-neutral-300 mb-8"
        >
          for Your dApps
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl text-neutral-400 max-w-4xl mx-auto mb-12 leading-relaxed"
        >
          Built on ICP to deliver lightning-fast content without centralized choke points. 
          Experience the future of content delivery with cryptographic security and global distribution.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.07, boxShadow: "0 4px 24px 0 rgba(255,140,0,0.15)" }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDeployNow}
            className="group bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 py-4 px-8 rounded-xl text-lg font-semibold transition-all duration-300 transform flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Deploy Now"
          >
            Deploy Now
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: 6 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="inline-block"
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </motion.button>
          <motion.a
            href="#features"
            className="group py-4 px-8 rounded-xl text-lg font-semibold border-2 border-neutral-600 hover:border-orange-500 hover:text-orange-500 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            onClick={e => {
              e.preventDefault();
              document.querySelector('#features').scrollIntoView({ behavior: 'smooth' });
            }}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
            aria-label="See Features"
          >
            See Features
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: 6 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="inline-block"
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </motion.a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.15 } },
          }}
          className="flex flex-wrap justify-center gap-8 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } }}
              whileHover={{ scale: 1.08, backgroundColor: "rgba(255,140,0,0.07)" }}
              className="flex items-center gap-3 text-neutral-300 rounded-xl px-4 py-2 transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              tabIndex={0}
              aria-label={stat.label}
            >
              <div className="text-orange-500">{stat.icon}</div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-neutral-400">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Background Illustrations with Content Overlay */}
        <div className="relative mt-16">
          {/* Background Illustrations */}
          <div className="absolute inset-0 flex justify-center items-center opacity-10">
            <div className="absolute top-0 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
              <img 
                src={undrawUpload} 
                alt="File Upload" 
                className="w-64 h-64 object-contain"
              />
            </div>
            <div className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2">
              <img 
                src={undrawShare} 
                alt="Share Links" 
                className="w-64 h-64 object-contain"
              />
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
              <img 
                src={undrawStars} 
                alt="To The Stars" 
                className="w-64 h-64 object-contain"
              />
            </div>
          </div>
          
          {/* Content Overlay */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-10 bg-gradient-to-r from-orange-500/10 to-orange-800/10 backdrop-blur-sm rounded-2xl p-12 border border-orange-500/20 shadow-xl shadow-orange-900/10"
          >
            <h3 className="text-3xl font-bold text-center mb-6">
              Experience the Future of Content Delivery
            </h3>
            <p className="text-lg text-neutral-300 text-center max-w-3xl mx-auto leading-relaxed">
              Upload your files with ease, share them globally, and watch your content reach new heights. 
              Our decentralized CDN powered by the Internet Computer ensures your assets are always available, 
              secure, and lightning-fast.
            </p>
            <div className="flex justify-center mt-8">
              <motion.button
                onClick={() => document.querySelector('#features').scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 py-3 px-8 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                aria-label="Explore Features"
              >
                Explore Features
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-16 flex flex-col items-center"
        >
          <div className="text-neutral-500 text-sm mb-2">Scroll to explore</div>
          <div className="w-6 h-10 border-2 border-neutral-600 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-orange-500 rounded-full mt-2 animate-bounce"></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;