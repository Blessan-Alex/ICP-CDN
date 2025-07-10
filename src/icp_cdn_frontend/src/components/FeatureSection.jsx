import { features } from "../constants";

const FeatureSection = () => {
  return (
    <div className="relative mt-20 border-b border-neutral-800 min-h-[800px] w-full">
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
          {features.map((feature, index) => (
            <div key={index} className="w-full sm:w-1/2 lg:w-1/3 p-4">
              <div className="group bg-neutral-900/50 backdrop-blur-sm rounded-2xl p-8 border border-neutral-800 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1">
                <div className="flex items-start">
                  <div className="flex mx-6 h-12 w-12 p-3 bg-gradient-to-r from-orange-500 to-orange-700 text-white justify-center items-center rounded-xl group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="mt-1 mb-4 text-xl font-semibold group-hover:text-orange-400 transition-colors duration-300">
                      {feature.text}
                    </h5>
                    <p className="text-md text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20">
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-neutral-400 mb-6 max-w-2xl mx-auto">
              Join the future of decentralized content delivery. Upload your first file and experience the power of ICP.
            </p>
            <button 
              onClick={() => document.querySelector('#home').scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Deploy Your CDN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureSection;