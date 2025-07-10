const Mission = () => {
  return (
    <div className="relative mt-20 border-b border-neutral-800 min-h-[400px] w-full">
      {/* Background Pattern - Extended to sides */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-800/5"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-12 border border-orange-500/20 text-center">
          <h2 className="text-4xl font-bold mb-8">
            Our Mission
          </h2>
          <p className="text-xl text-neutral-300 leading-relaxed max-w-4xl mx-auto">
            We're building the future of content delivery by leveraging the power of the Internet Computer. 
            Our decentralized CDN ensures that your content is fast, secure, and always available, 
            without the traditional bottlenecks of centralized infrastructure.
          </p>
          <div className="mt-8">
            <button 
              onClick={() => document.querySelector('#home').scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 py-3 px-8 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mission; 