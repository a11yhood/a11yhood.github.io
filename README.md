# a11yhood - Accessible Product Reviews

A community platform for discovering, reviewing, and discussing accessibility products. Features automated product discovery from Thingiverse, Ravelry, and GitHub, along with user-submitted content and blog functionality.

### Frontend
- **Framework**: React 19, TypeScript
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui, Radix UI
- **Icons**: Phosphor Icons
- **Testing**: Vitest, React Testing Library
- **Build Tool**: Vite
- **Auth**: Supabase Auth

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── ...             # Feature components
│   ├── lib/                # Utilities and services
│   │   ├── supabase.ts     # Supabase client
│   │   ├── api-client.ts   # API client for backend
│   │   ├── database.ts     # Database service layer
│   │   └── types.ts        # TypeScript type definitions
│   └── __tests__/          # Test files
└── App.tsx                 # Main application

## Key Features Explained

### URL Routing
Each product has a unique REST-style URL:
- Product: `/product/{productId}`
- Blog post: `/blog/{slug}`
- Profile: `/profile`
- Admin: `/admin`

URLs are shareable and bookmarkable.

## License

BSD 3-Clause License - See LICENSE file for details.

This project is built with React, TypeScript, and FastAPI, using Supabase for authentication and PostgreSQL for data storage.
