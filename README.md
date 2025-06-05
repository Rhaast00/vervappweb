# VervApp - AI Website Redesign

VervApp is a web application that uses AI to analyze and redesign websites according to user preferences. Users can input a website URL, get an AI analysis of its design elements, and then choose a design style for the AI to apply in creating a redesigned version.

## Features

- **User Authentication**: Secure login with Supabase magic links
- **Website Analysis**: AI-powered analysis of website design elements including colors, fonts, and layout
- **Design Style Selection**: Choose from various design styles (minimalist, brutalist, glassmorphism, etc.)
- **AI Redesign**: Generate a complete redesign of the website based on the selected style
- **Code Export**: Get the HTML and CSS code for the redesigned website

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Authentication**: Supabase Auth
- **AI**: OpenAI API
- **Web Scraping**: Axios, Cheerio

## Getting Started

### Prerequisites

- Node.js (latest LTS version)
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vervappweb.git
   cd vervappweb
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
vervappweb/
├── src/
│   ├── app/
│   │   ├── analyze/       # Website URL input page
│   │   ├── design/        # Design style selection page
│   │   ├── login/         # Authentication page
│   │   ├── result/        # Redesign results page
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout with providers
│   │   └── page.tsx       # Redirect to login
│   ├── context/
│   │   ├── AuthContext.tsx    # Authentication context
│   │   └── WebsiteContext.tsx # Website data context
│   ├── lib/
│   │   ├── openai-client.ts   # OpenAI client setup
│   │   └── supabase-client.ts # Supabase client setup
│   ├── services/
│   │   ├── website-analyzer.ts    # Website analysis service
│   │   └── website-redesigner.ts  # Website redesign service
│   └── types/
│       └── index.ts       # TypeScript type definitions
├── public/                # Static assets
├── .env.local            # Environment variables (not in repo)
├── package.json          # Project dependencies
└── README.md             # Project documentation
```

## Usage Flow

1. User logs in via Supabase magic link authentication
2. User enters a website URL to analyze
3. AI analyzes the website and extracts design elements
4. User selects a design style from the available options
5. AI generates a redesigned version based on the original website and chosen style
6. User can view the preview, HTML, and CSS of the redesigned website

## Deployment

This project can be deployed on Vercel, Netlify, or any other platform that supports Next.js applications.

## License

This project is licensed under the MIT License.
