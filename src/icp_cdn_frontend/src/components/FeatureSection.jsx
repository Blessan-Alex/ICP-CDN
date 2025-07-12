import { features } from "../constants";
import { motion } from "framer-motion";

const cardVariants = {
  offscreen: { opacity: 0, y: 60 },
  onscreen: (i) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring", bounce: 0.25, duration: 0.7, delay: i * 0.12 },
  }),
};

// Brief feature descriptions for less crowding
const briefFeatures = features.map(f => ({
  ...f,
  description: f.description.split(". ")[0] + "." // Take only the first sentence
}));

const FeatureSection = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative mt-20 border-b border-neutral-800 min-h-[800px] w-full"
    >
      {/* Background Pattern - Extended to sides */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-800/5"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center">
          <span className="bg-neutral-900 text-orange-500 rounded-full h-6 text-sm font-medium px-2 py-1 uppercase">
            Features
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl mt-10 lg:mt-20 tracking-wide">
            Powerful{" "}
            <span className="bg-gradient-to-r from-orange-500 to-orange-800 text-transparent bg-clip-text">
              CDN Features
            </span>
          </h2>
          <p className="mt-6 text-lg text-neutral-400 max-w-3xl mx-auto">
            Experience the next generation of content delivery with our comprehensive suite of decentralized features.
          </p>
        </div>
        <div className="flex flex-wrap mt-16 lg:mt-20">
          {briefFeatures.map((feature, index) => (
            <motion.div
              key={index}
              className="w-full sm:w-1/2 lg:w-1/3 p-4 flex"
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.2 }}
              variants={cardVariants}
              custom={index}
            >
              <motion.div
                whileHover={{ scale: 1.04, boxShadow: "0 8px 32px 0 rgba(255,140,0,0.10)", borderColor: "#ff8800" }}
                whileTap={{ scale: 0.98 }}
                className="group flex flex-col justify-between w-full h-full min-h-[260px] max-h-[320px] bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-300"
                tabIndex={0}
                aria-label={feature.text}
                style={{ boxSizing: 'border-box' }}
              >
                <div className="flex items-start mb-4">
                  <motion.div
                    whileHover={{ scale: 1.18, rotate: 8 }}
                    className="flex h-12 w-12 p-3 bg-gradient-to-r from-orange-500 to-orange-700 text-white justify-center items-center rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-md"
                  >
                    {feature.icon}
                  </motion.div>
                  <div className="flex-1 ml-4 text-left">
                    <h5 className="mt-1 mb-2 text-xl font-semibold group-hover:text-orange-400 transition-colors duration-300">
                      {feature.text}
                    </h5>
                  </div>
                </div>
                <p className="text-md text-neutral-300 leading-relaxed text-left group-hover:text-neutral-100 transition-colors duration-300 mb-2 flex-1">
                  {feature.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20">
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-neutral-400 mb-6 max-w-2xl mx-auto">
              Join the future of decentralized content delivery. Upload your first file and experience the power of ICP.
            </p>
            <motion.button
              onClick={() => document.querySelector('#home').scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.97 }}
              aria-label="Deploy Your CDN"
            >
              Deploy Your CDN
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FeatureSection;