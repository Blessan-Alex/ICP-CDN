import { Rocket } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { Settings } from "lucide-react";
import { Shield } from "lucide-react";
import { Folder } from "lucide-react";
import { BarChart } from "lucide-react";

export const navItems = [
  { label: "Home", href: "#home", type: "scroll" },
  { label: "Features", href: "#features", type: "scroll" },
  { label: "About Us", href: "#about", type: "scroll" },
  { label: "Mission", href: "#mission", type: "scroll" },
];

export const dashboardNavItem = {
  label: "Upload", 
  href: "/upload", 
  type: "page"
};

export const enhancedNavItems = [
  { label: "Cache", href: "/cache", type: "page" },
  { label: "Tiers", href: "/tiers", type: "page" },
  { label: "Resize", href: "/resize", type: "page" },
  { label: "Library Demo", href: "/library-demo", type: "page" },
  { label: "Canister Demo", href: "/canister-demo", type: "page" },
  { label: "Performance", href: "/performance", type: "page" },
];

export const features = [
  {
    icon: <Rocket />,
    text: "Decentralized Content Delivery Network",
    description:
      "True decentralization with no single points of failure. Built entirely on ICP with distributed storage, global boundary node distribution, and cryptographic content verification for maximum reliability.",
  },
  {
    icon: <ShieldCheck />,
    text: "HTTP Outcalls & IPFS Integration",
    description:
      "Pure ICP-native implementation with direct HTTP outcalls to IPFS gateways and Pinata API. No external dependencies - everything runs on-chain with real-time content fetching and storage.",
  },
  {
    icon: <Settings />,
    text: "Intelligent LRU Cache System",
    description:
      "Advanced on-chain caching with LRU eviction policies, automatic content optimization, and smart storage management. Achieve 95%+ cache hit rates with intelligent content delivery.",
  },
  {
    icon: <Shield />,
    text: "Canister-to-Canister Communication",
    description:
      "Complete Rust client library enabling seamless integration for other ICP projects. Open source library for OpenChat, Caffeine, and any dApp with automatic cycles payment and bulk operations.",
  },
  {
    icon: <Folder />,
    text: "Tier System & Cycles Billing",
    description:
      "Native ICP cycles-based billing with transparent pricing tiers (Free, Starter, Pro, Business). Real cycles acceptance, cost estimation, and sustainable economics for the ICP ecosystem.",
  },
  {
    icon: <BarChart />,
    text: "On-Chain Image Processing",
    description:
      "Real-time image resizing, format conversion, and optimization directly within canisters. No external services needed - pure ICP compute capabilities for content transformation.",
  },
  {
    icon: <Rocket />,
    text: "Performance Analytics & Monitoring",
    description:
      "Comprehensive real-time analytics with cache performance metrics, user analytics, and system health monitoring. Track decentralized content delivery performance with detailed insights.",
  },
  {
    icon: <ShieldCheck />,
    text: "Global Boundary Node Distribution",
    description:
      "Leverage ICP's global boundary node network for worldwide content delivery. Your content is automatically distributed across multiple geographic locations for optimal performance and minimal latency.",
  },
  {
    icon: <Settings />,
    text: "Cryptographic Content Verification",
    description:
      "End-to-end content integrity with cryptographic verification. Every file is tamper-proof with hash verification, ensuring your content remains secure and authentic throughout the delivery chain.",
  },
];

export const checklistItems = [
  {
    title: "Code merge made easy",
    description:
      "Track the performance of your VR apps and gain insights into user behavior.",
  },
  {
    title: "Review code without worry",
    description:
      "Track the performance of your VR apps and gain insights into user behavior.",
  },
  {
    title: "AI Assistance to reduce time",
    description:
      "Track the performance of your VR apps and gain insights into user behavior.",
  },
  {
    title: "Share work in minutes",
    description:
      "Track the performance of your VR apps and gain insights into user behavior.",
  },
];


export const pricingOptions = [
  {
    title: "Free",
    price: "$0",
    features: [
      "Private board sharing",
      "5 Gb Storage",
      "Web Analytics",
      "Private Mode",
    ],
  },
  {
    title: "Pro",
    price: "$10",
    features: [
      "Private board sharing",
      "10 Gb Storage",
      "Web Analytics (Advance)",
      "Private Mode",
    ],
  },
  {
    title: "Enterprise",
    price: "$200",
    features: [
      "Private board sharing",
      "Unlimited Storage",
      "High Performance Network",
      "Private Mode",
    ],
  },
];

export const resourcesLinks = [
  { href: "#", text: "Documentation" },
  { href: "#", text: "API Reference" },
  { href: "#", text: "GitHub" },
];

export const platformLinks = [
  { href: "#", text: "Features" },
  { href: "#", text: "Pricing" },
  { href: "#", text: "Support" },
];

export const communityLinks = [
  { href: "#", text: "Discord" },
  { href: "#", text: "Twitter" },
  { href: "#", text: "Blog" },
];