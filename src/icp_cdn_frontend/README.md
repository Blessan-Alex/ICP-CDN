# Decentralized-CDN

A minimal React + Vite template providing a fast, modern development setup with HMR (Hot Module Replacement) and ESLint integration. This project serves as a foundation for building scalable, production-ready applications with a focus on simplicity and developer experience.

## Features

- ⚡️ **Vite** for ultra-fast development and build
- ⚛️ **React** with HMR for instant feedback
- 🛡️ **ESLint** with sensible rules for code quality
- 🔌 Supports both official React plugins:
  - `@vitejs/plugin-react` (Babel-based Fast Refresh)
  - `@vitejs/plugin-react-swc` (SWC-based Fast Refresh)
- 📝 Easy to extend for TypeScript and advanced linting

## Getting Started

Follow these steps to set up and run the project locally:

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/ruffledArchimedes/Decentralized-CDN.git
   cd Decentralized-CDN
   ```

2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```sh
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser and visit:**
   ```
   http://localhost:5173
   ```

## Expanding the ESLint Configuration

For production applications, we recommend using TypeScript with type-aware lint rules enabled. Check out the [Vite TypeScript template](https://vitejs.dev/guide/#scaffolding-your-first-vite-project) for information on integrating TypeScript and `typescript-eslint` into your project.

## License

This project is currently unlicensed. Please add a license if you intend to distribute or use it in production.

---

Made using [Vite](https://vitejs.dev/) and [React](https://react.dev/)
