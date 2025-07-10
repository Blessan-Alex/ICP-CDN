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
  label: "Dashboard", 
  href: "/dashboard", 
  type: "page"
};

export const features = [
  {
    icon: <Rocket />,
    text: "Decentralized File Storage",
    description:
      "Store your files securely on the Internet Computer blockchain with cryptographic verification. Every file is tamper-proof and distributed across multiple nodes for maximum reliability and global accessibility.",
  },
  {
    icon: <ShieldCheck />,
    text: "User Authentication & Isolation",
    description:
      "Built-in Internet Identity authentication ensures your files are private and isolated. Each user's data is cryptographically separated, preventing unauthorized access and maintaining complete privacy.",
  },
  {
    icon: <Settings />,
    text: "Chunked Upload & Download",
    description:
      "Handle large files efficiently with automatic chunked uploads and downloads. Files over 500KB are automatically split into manageable chunks for reliable transfer and optimal performance.",
  },
  {
    icon: <Shield />,
    text: "Global Asset Distribution",
    description:
      "Files are served through dedicated asset canisters with HTTP certification, ensuring fast global access. Your content is available worldwide with minimal latency and maximum reliability.",
  },
  {
    icon: <Folder />,
    text: "Comprehensive File Management",
    description:
      "Upload, view, delete, and share files with unique asset links. Support for images, videos, documents, web assets, and fonts with automatic content type detection and management.",
  },
  {
    icon: <BarChart />,
    text: "Real-time Dashboard",
    description:
      "Monitor your CDN usage with an intuitive dashboard showing file counts, storage usage, and network statistics. Track your decentralized content delivery performance in real-time.",
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