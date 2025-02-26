# Restaurant Management System

## Project Overview

The **Restaurant Management System** is a modern web application built with React and Supabase. It helps restaurant owners efficiently manage orders, menus, reservations, and customer interactions.

## Technologies Used

- **Vite** - Fast and optimized development environment
- **React** - Frontend library for UI development
- **TypeScript** - Strongly typed JavaScript
- **Shadcn UI** - Modern UI components
- **Tailwind CSS** - Utility-first styling framework
- **Supabase** - Backend as a service with authentication and database support

## Getting Started

To set up the project locally, follow these steps:

### Prerequisites

Ensure you have **Node.js** and **npm** installed. You can install Node.js via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

### Installation

1. **Clone the repository:**

   ```sh
   git clone <YOUR_GIT_URL>
   ```

2. **Navigate to the project directory:**

   ```sh
   cd restaurant-management-system
   ```

3. **Install dependencies:**

   ```sh
   npm install
   ```

4. **Set up environment variables:**

   Create a `.env` file in the root directory and add your Supabase credentials:

   ```sh
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server:**

   ```sh
   npm run dev
   ```

   Your app will be running at `http://localhost:5173`

## Editing the Code

### Using Your Preferred IDE

You can open the project in your favorite code editor (VS Code, WebStorm, etc.), make changes, and push them to the repository.

### Using GitHub Codespaces

1. Navigate to your repository on GitHub.
2. Click the **Code** button and go to the **Codespaces** tab.
3. Click **Create codespace** to launch a cloud-based development environment.

## Deployment

### Deploying to Vercel

1. Install Vercel CLI:

   ```sh
   npm install -g vercel
   ```

2. Run the deployment command:

   ```sh
   vercel
   ```

Follow the CLI instructions to complete the setup.

### Deploying to Netlify

1. Install Netlify CLI:

   ```sh
   npm install -g netlify-cli
   ```

2. Deploy the project:

   ```sh
   netlify deploy
   ```

## Custom Domain Setup

To deploy under your own domain, configure your domain settings in your Netlify or Vercel dashboard.

## Contributing

Feel free to fork this repository, create a new branch, and submit a pull request for any improvements.

## License

This project is open-source and available under the [MIT License](LICENSE).

---

Enjoy building with React and Supabase! 🚀

