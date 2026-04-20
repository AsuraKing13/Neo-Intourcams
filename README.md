# INTOURCAMS - Integrated Tourism Coordination and Monitoring System

INTOURCAMS is an integrated dashboard designed for Sarawak tourism. It provides a comprehensive suite of tools for managing grants, monitoring tourism clusters, visualizing analytics, and tracking events to support industry growth.

## Features

- **Dashboard**: Real-time overview of tourism metrics and key performance indicators.
- **Grant Management**: End-to-end workflow for grant applications, reviews, and reporting.
- **Tourism Clusters**: Management and monitoring of tourism clusters across the region.
- **Event Tracking**: Integrated calendar and tracking for tourism-related events.
- **Analytics**: Data visualization for visitor trends, ROI, and website traffic.
- **Itinerary Planner**: Tool for users to plan and manage their tourism itineraries.
- **Multi-role Access**: Secure access control for Admins, Editors, and Users.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage)
- **Charts**: Recharts
- **Icons**: Heroicons, Lucide React
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd intourcams
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials and API keys:
     ```env
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     VITE_API_KEY=your_gemini_api_key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

The project is configured for deployment via Vite. To build for production:

```bash
npm run build
```

The output will be in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
