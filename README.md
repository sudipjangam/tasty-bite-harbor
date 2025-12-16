# Restaurant Management System

A comprehensive, modern restaurant management platform built with React and Supabase. This full-featured solution helps restaurant owners efficiently manage orders, menus, reservations, staff, inventory, and customer interactions with AI-powered insights.

## 🌟 Key Features

### Core Operations

- **📊 Dashboard** - Real-time business overview with KPIs, revenue tracking, and activity feed
- **🛒 Orders Management** - Complete order lifecycle (New → Preparing → Ready → Completed), hold orders, and kitchen integration
- **🍽️ Menu Management** - Categories, items with images, pricing, modifiers, and availability toggling
- **📋 Table Management** - Visual table layout, status tracking, and real-time occupancy
- **👨‍🍳 Kitchen Display (KDS)** - Real-time order queue for kitchen staff with status updates
- **💰 POS System** - Full-featured point of sale with multiple payment methods

### Advanced Features

- **📦 Inventory Management** - Stock tracking, low-stock alerts, automatic deduction on orders, supplier management
- **📅 Reservations** - Online booking, table assignment, waitlist management, and confirmation notifications
- **🛏️ Room Management** - For hotel-restaurants: room booking, housekeeping tasks, and guest services
- **👥 Customer Management (CRM)** - Loyalty programs, customer segmentation, purchase history, and lifetime value tracking
- **👔 Staff Management** - Roles, attendance tracking, clock-in/out, salary and commission calculations
- **📈 Analytics** - Sales trends, revenue forecasting, top performers, growth calculations
- **📑 Reports** - Generate, schedule, and export reports (CSV/PDF) for sales, inventory, staff, and more

### Integrations & AI

- **🤖 AI Assistant** - Chat with Gemini for sales forecasting, inventory recommendations, and business insights
- **📱 WhatsApp Integration** - Send bills, reservation confirmations, and promotions via Twilio
- **📧 Email Notifications** - Billing, reservation confirmations, and marketing communications
- **🔗 Channel Sync** - Integration with delivery platforms (Zomato, Swiggy, etc.)

### Security & Administration

- **🔐 Role-Based Access Control (RBAC)** - Custom roles with granular permissions
- **👤 User Management** - Multi-user support with permission-based component access
- **💾 Backup & Restore** - Database backups with restore capabilities
- **🌙 Dark Mode** - Full dark mode support across all components

---

## 🛠️ Technologies Used

| Category             | Technology                                           |
| -------------------- | ---------------------------------------------------- |
| **Frontend**         | React 18, TypeScript                                 |
| **Bundler**          | Vite                                                 |
| **UI Components**    | Shadcn UI, Radix UI                                  |
| **Styling**          | Tailwind CSS                                         |
| **Backend**          | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| **AI**               | Google Gemini                                        |
| **Communication**    | Twilio (WhatsApp), Email                             |
| **Charts**           | Recharts                                             |
| **Testing**          | Vitest, React Testing Library                        |
| **State Management** | TanStack Query (React Query)                         |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v18+) and **npm** installed. Install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

### Installation

1. **Clone the repository:**

   ```sh
   git clone <YOUR_GIT_URL>
   ```

2. **Navigate to the project directory:**

   ```sh
   cd tasty-bite-harbor
   ```

3. **Install dependencies:**

   ```sh
   npm install
   ```

4. **Set up environment variables:**

   Create a `.env` file in the root directory with your credentials:

   ```sh
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server:**

   ```sh
   npm run dev
   ```

   Your app will be running at `http://localhost:5173`

---

## 🧪 Testing

The project includes a comprehensive test suite with 229+ tests covering pages, integration, and business logic.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- src/tests/pages/Orders.test.tsx
```

For detailed testing documentation, see [docs/TESTING.md](docs/TESTING.md).

---

## 📁 Project Structure

```
src/
├── app/                    # App-level configuration
├── components/             # React components (350+ files)
│   ├── Analytics/          # Analytics charts and widgets
│   ├── Dashboard/          # Dashboard components
│   ├── Kitchen/            # Kitchen display system
│   ├── Orders/             # Order management
│   ├── Inventory/          # Stock and supplier management
│   ├── Reservations/       # Booking system
│   ├── Rooms/              # Hotel room management
│   ├── Staff/              # Staff management
│   ├── ui/                 # Shadcn UI components
│   └── ...                 # Other feature components
├── hooks/                  # Custom React hooks (40+ hooks)
├── integrations/           # External service integrations
├── pages/                  # Page components (34 pages)
├── tests/                  # Test suite
│   ├── pages/              # Page tests
│   ├── integration/        # Integration tests
│   └── utils/              # Test utilities
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions

supabase/
└── functions/              # Edge Functions (25+ functions)
    ├── chat-with-gemini/   # AI chat integration
    ├── send-whatsapp/      # WhatsApp messaging
    ├── backup-restore/     # Database backup
    └── ...                 # Other serverless functions

docs/
└── TESTING.md              # Comprehensive testing guide
```

---

## 📡 API Documentation

The system includes 25+ Supabase Edge Functions for serverless operations:

| Category         | Functions                                                                               |
| ---------------- | --------------------------------------------------------------------------------------- |
| **AI & Chat**    | `chat-with-gemini`, `chat-with-ai`, `chat-with-api`                                     |
| **WhatsApp**     | `send-whatsapp`, `send-whatsapp-bill`                                                   |
| **Reservations** | `send-reservation-confirmation`, `send-reservation-reminder`, `find-active-reservation` |
| **Inventory**    | `check-low-stock`, `deduct-inventory-on-prep`                                           |
| **Staff**        | `record-clock-entry`, `check-missed-clocks`                                             |
| **Security**     | `role-management`, `user-management`, `get-user-components`                             |
| **Utilities**    | `validate-promo-code`, `backup-restore`, `upload-image`                                 |

For complete API documentation, see [supabase/functions/API_DOCUMENTATION.md](supabase/functions/API_DOCUMENTATION.md).

### Rate Limiting

- AI Chat: 30 requests/minute per user
- WhatsApp: 100 messages/hour per user

---

## 🖥️ Development

### Using Your Preferred IDE

Open the project in VS Code, WebStorm, or your favorite editor. Key extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript support

### Using GitHub Codespaces

1. Navigate to your repository on GitHub
2. Click **Code** → **Codespaces** tab
3. Click **Create codespace** to launch cloud development

---

## 🚢 Deployment

### Deploying to Vercel

```sh
npm install -g vercel
vercel
```

### Deploying to Netlify

```sh
npm install -g netlify-cli
netlify deploy
```

### Environment Variables for Production

Ensure these are set in your deployment platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🔒 Security

The application implements:

- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - All API endpoints require valid tokens
- **Role-Based Permissions** - Granular component access control
- **Rate Limiting** - Protection against abuse

---

## 📱 Mobile Responsive

The application is fully responsive and optimized for:

- Desktop (1920px+)
- Laptop (1024px - 1920px)
- Tablet (768px - 1024px)
- Mobile (320px - 768px)

---

## 🤝 Contributing

1. Fork this repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

## 📞 Support

For support, please contact the development team or open an issue in the repository.

---

**Built with ❤️ using React and Supabase** 🚀
