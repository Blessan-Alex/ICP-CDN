import { Rocket } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { Settings } from "lucide-react";
import { Shield } from "lucide-react";
import { Folder } from "lucide-react";
import { BarChart } from "lucide-react";

export const navItems = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Features", href: "#" },
  { label: "Pricing", href: "#" },
  { label: "Docs", href: "#" },
  { label: "Community", href: "#" },
  { label: "Get Started", href: "#" },
];
export const features = [
  {
    icon: <Rocket />,
    text: "Decentralized Edge Delivery",
    description:
      "Distribute your content across global network of ICP nodes, ensuring lightening- fast access for users anywhere in the world.By leveraging proximity to end users, we minimize latency and maximize load times.",
  },
  {
    icon: <ShieldCheck />,
    text: "Immutable and Secure",
    description:
      "Every file is cryptographically verified and tamper-proof, guaranteeing the integrity of your data.This means once stored, your content cannot be altered or deleted by malicious actors.",
  },
  {
    icon: <Settings />,
    text: "Auto-Scaling & Self-healing",
    description:
      "No more manual infrastructure headaches- our network grows and recovers automatically to meet demand.As your dApp’s traffic spikes, additional edge nodes seamlessly handle the load.",
  },
  {
    icon: <Shield />,
    text: "Built-in Redundancy",
    description:
      "Files are replicated across multiple nodes, eliminating single points of failure and keeping your content always online.Even if a node fails, your users won’t notice any disruption.",
  },
  {
    icon: <Folder />,
    text: "Programmable Caching Policies",
    description:
      "Customize how and where your content is cached, optimizing for performance and cost.Set rules to prioritize popular files or aggressively cache near key user bases.Adapt your delivery strategy to match your app’s unique needs.",
  },
  {
    icon: <BarChart />,
    text: "Real-time Analytics",
    description:
      "Monitor file requests, cache performance, and geographic distribution through an intuitive dashboard. Gain insights into user behavior and traffic patterns at a glance.",
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
  { href: "#", text: "Getting Started" },
  { href: "#", text: "Documentation" },
  { href: "#", text: "Tutorials" },
  { href: "#", text: "API Reference" },
  { href: "#", text: "Community Forums" },
];

export const platformLinks = [
  { href: "#", text: "Features" },
  { href: "#", text: "Supported Devices" },
  { href: "#", text: "System Requirements" },
  { href: "#", text: "Downloads" },
  { href: "#", text: "Release Notes" },
];

export const communityLinks = [
  { href: "#", text: "Events" },
  { href: "#", text: "Meetups" },
  { href: "#", text: "Conferences" },
  { href: "#", text: "Hackathons" },
  { href: "#", text: "Jobs" },
];