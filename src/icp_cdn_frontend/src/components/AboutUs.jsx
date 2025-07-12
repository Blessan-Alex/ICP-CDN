import { Github, Linkedin, Mail } from "lucide-react";
import { motion } from "framer-motion";

const teamMembers = [
  {
    name: "Sakshi Khatri",
    role: "Full Stack dApp Developer",
    description: "A dynamic and awesome full stack dApp developer with expertise in blockchain technology and decentralized applications. Passionate about building innovative solutions on the Internet Computer.",
    linkedin: "https://www.linkedin.com/in/sakshi-k-883267360/",
    github: "https://github.com/khxtrikk",
    email: "khatrisakshi3003@gmail.com"
  },
  {
    name: "Mani Verma",
    role: "Curious Power Person",
    description: "A curious, amazing, and sweet power person who brings creativity and technical excellence to every project. Always exploring new technologies and pushing the boundaries of what's possible.",
    linkedin: "https://www.linkedin.com/in/mani-verma-2b4334293/",
    github: "https://github.com/mani10verma11",
    email: "mani10verma11@gmail.com"
  },
  {
    name: "Blessan Alex",
    role: "Curious Learner",
    description: "A curious learner who never gets tired of learning and explores everything. Passionate about continuous improvement and discovering new ways to solve complex problems.",
    linkedin: "https://www.linkedin.com/in/blessan-alex/",
    github: "https://github.com/Blessan-Alex",
    email: "blazeblessan123@gmail.com"
  }
];

const cardVariants = {
  offscreen: { opacity: 0, y: 60 },
  onscreen: (i) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring", bounce: 0.25, duration: 0.7, delay: i * 0.15 },
  }),
};

const AboutUs = () => {
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
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center mb-16"
        >
          <span className="bg-neutral-900 text-orange-500 rounded-full h-6 text-sm font-medium px-2 py-1 uppercase">
            Team
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl mt-10 lg:mt-20 tracking-wide">
            Meet Our{" "}
            <span className="bg-gradient-to-r from-orange-500 to-orange-800 text-transparent bg-clip-text">
              Amazing Team
            </span>
          </h2>
          <p className="mt-6 text-lg text-neutral-400 max-w-3xl mx-auto">
            We're passionate about building the future of decentralized content delivery on the Internet Computer.
          </p>
        </motion.div>
        {/* Team Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {teamMembers.map((member, index) => (
            <motion.div
              key={index}
              className="group bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-300 flex flex-col justify-between w-full h-full min-h-[340px] max-h-[400px]"
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.2 }}
              variants={cardVariants}
              custom={index}
              tabIndex={0}
              aria-label={member.name}
              style={{ boxSizing: 'border-box' }}
            >
              {/* Avatar Placeholder (unchanged size) */}
              <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center text-2xl font-bold text-white">
                {member.name ? member.name.split(' ').map(n => n[0]).join('') : 'CD'}
              </div>
              {/* Name and Role */}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold mb-2">{member.name}</h3>
                <p className="text-orange-500 font-medium">{member.role}</p>
              </div>
              {/* Description */}
              <p className="text-neutral-300 text-center mb-6 leading-relaxed flex-1">
                {member.description}
              </p>
              {/* Social Links */}
              <div className="flex justify-center space-x-4 mt-auto">
                <motion.a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-neutral-800 rounded-lg hover:bg-orange-500/20 hover:text-orange-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="LinkedIn"
                  tabIndex={0}
                  title="LinkedIn"
                >
                  <Linkedin size={20} />
                </motion.a>
                <motion.a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-neutral-800 rounded-lg hover:bg-orange-500/20 hover:text-orange-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="GitHub"
                  tabIndex={0}
                  title="GitHub"
                >
                  <Github size={20} />
                </motion.a>
                <motion.a
                  href={`mailto:${member.email}`}
                  className="p-2 bg-neutral-800 rounded-lg hover:bg-orange-500/20 hover:text-orange-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Email"
                  tabIndex={0}
                  title="Email"
                >
                  <Mail size={20} />
                </motion.a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AboutUs; 