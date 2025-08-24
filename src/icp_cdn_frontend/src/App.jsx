import HeroSection from "./components/HeroSection";
import Navbar from "./components/Navbar";
import FeatureSection from "./components/FeatureSection";
import AboutUs from "./components/AboutUs";
import Mission from "./components/Mission";
import Footer from "./components/Footer";
import Dashboard from "./components/Dashboard";
import EnhancedUpload from "./components/EnhancedUpload";
import ImageResizer from "./components/ImageResizer";
import CacheDashboard from "./components/CacheDashboard";
import PerformanceMonitor from "./components/PerformanceMonitor";
import Tiers from "./components/Tiers";
import CyclesBilling from "./components/CyclesBilling";
import TestInterface from "./components/TestInterface";
import LibraryDemo from "./components/LibraryDemo";
import { AuthProvider } from "./AuthContext";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={
              <div className="bg-neutral-950 text-white">
                <div id="home" className="w-full">
                  <HeroSection />
                </div>
                <div id="features" className="w-full">
                  <FeatureSection />
                </div>
                <div id="about" className="w-full">
                  <AboutUs />
                </div>
                <div id="mission" className="w-full">
                  <Mission />
                </div>
                <div className="max-w-7xl mx-auto px-6">
                  <Footer />
                </div>
              </div>
            }
          />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<EnhancedUpload />} />
          <Route path="/cache" element={<CacheDashboard />} />
          <Route path="/resize" element={<ImageResizer />} />
          <Route path="/performance" element={<PerformanceMonitor />} />
          <Route path="/tiers" element={<Tiers />} />
          <Route path="/billing" element={<CyclesBilling />} />
          <Route path="/tests" element={<TestInterface />} />
          <Route path="/library-demo" element={<LibraryDemo />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
