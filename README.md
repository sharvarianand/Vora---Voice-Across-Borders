# Vora - Voice Across Borders

Vora is an AI-powered lead management and campaign platform designed for global reach. It provides seamless localization and WhatsApp integration to help businesses connect with leads across linguistic boundaries.

[**Live Demo**](https://vora-web-1060546711050.us-central1.run.app/)

## 🚀 Features

- **Multilingual Support**: Real-time translation of messages using [Lingo.dev](https://lingo.dev).
- **AI-Powered Outreach**: Leverages OpenAI and Google Gemini for intelligent communication.
- **WhatsApp Integration**: Automated outreach via WhatsApp using the Baileys library.
- **Dynamic Dashboard**: Manage products, track leads, and monitor campaign performance.
- **Robust Tech Stack**: Built with Next.js, Supabase, and Clerk for scalability and security.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15+, React 19, Tailwind CSS, Lucide icons, GSAP animations.
- **Backend/DB**: Supabase (PostgreSQL), Next.js API Routes.
- **Auth**: Clerk & Supabase SSR.
- **Localization**: Lingo.dev.
- **LLM**: OpenAI GPT & Google Gemini Pro.
- **Communication**: @whiskeysockets/baileys (WhatsApp).
- **Analytics**: Recharts.

## 📦 Project Structure

- `app/`: Next.js application routes and components.
- `components/`: Reusable UI and layout components.
- `worker/`: Background worker for WhatsApp processing and campaigns.
- `lingo/`: Localization files and configuration.
- `lib/`: Shared utilities and API clients.
- `supabase/`: Database migrations.

## 🏁 Getting Started

### Prerequisites

- Node.js (v20+)
- pnpm

### Installation

1.  Clone the repository:
    ```bash
    git clone [repository-url]
    cd vora
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Set up environment variables:
    Create a `.env.local` file in the root directory and add the necessary credentials (see `.env.example` if available).

4.  Run the development server:
    ```bash
    pnpm dev
    ```

5.  Run the worker:
    ```bash
    pnpm worker
    ```

## 📄 License

This project is private and for internal use only.
