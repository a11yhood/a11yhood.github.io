# A11yhood Front End Website

This is the main repository for the [A11yhood front end website](https://a11yhood.org). A11yhood is a community platform for discovering, reviewing, and discussing open-source assistive technologies. A11yhood serves as a central hub for disabled and non-disabled makers, developers, and contributors to find, use, and contribute to accessibility projects.

To join our community and learn about contributing, go to the [community](https://github.com/a11yhood/community) repository. [Learn more](https://github.com/a11yhood)

## Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui, Radix UI
- **Icons**: Phosphor Icons, FontAwesome
- **Forms**: React Hook Form with Zod validation
- **Testing**: Vitest, React Testing Library
- **Auth**: Supabase Auth
- **State Management**: React Context, TanStack Query

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── AboutPage.tsx   # About page
│   │   ├── AdminDashboard.tsx
│   │   ├── BlogManager.tsx
│   │   ├── CollectionsList.tsx
│   │   ├── ProductDetail.tsx
│   │   └── ...             # Other feature components
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities and services
│   │   ├── supabase.ts     # Supabase client
│   │   ├── api.ts          # API client
│   │   ├── scrapers.ts     # Web scraping utilities
│   │   ├── types.ts        # TypeScript type definitions
│   │   └── utils.ts        # Helper functions
│   ├── styles/             # Global styles
│   ├── __tests__/          # Test files
│   │   ├── components/
│   │   ├── accessibility/
│   │   ├── integration/
│   │   └── security/
│   └── App.tsx             # Main application
└── public/                 # Static assets

```

## Getting Started

### Prerequisites

- pixi

### Install Pixi (macOS)

Visit https://pixi.prefix.dev for more information.

Choose one option:

```bash
# Homebrew
brew install pixi
```

```bash
# Official installer
curl -fsSL https://pixi.sh/install.sh | bash
```

Verify installation:

```bash
pixi --version
```
### Using Pixi

Use Pixi to provide the project runtime, then run npm commands inside that environment.

### Installation

We assume throughout that you are already running pixi. 

```bash
 pixi shell
```

1. **Clone the repository**
   ```bash
   git clone https://github.com/a11yhood/a11yhood.github.io.git
   cd a11yhood.github.io
   ```

2. **Install Node + npm dependencies via Pixi**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file (and/or `.env.production.local` for production):

   See `env.example` for all available configuration options.

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Lint
npm run lint

# Accessibility
npm run test:a11y
npm run test:a11y-integration

```

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

### Bundle-only Vite build via Pixi task
Note: this skips tests and TypeScript type checking

```bash
pixi run build-vite

# Production preview
npm run preview
```

# Code Quality

The project includes:
- **ESLint** for code linting 
- **TypeScript** for type safety
- **Vitest** for unit and integration testing
- **React Testing Library** for component testing
- Accessibility tests for critical UI components 

## Key Features Explained

### URL Routing

Each page has a unique, shareable REST-style URL:
- Product detail: `/product/{productId}`
- Collection: `/collection/{collectionId}`
- Blog post: `/blog/{slug}`
- User profile: `/profile`
- Public profile: `/profile/{username}`
- Admin dashboard: `/admin`

### Product Sources

Products are automatically scraped from:
- **GitHub**: Projects tagged with accessibility keywords
- **Ravelry**: Patterns tagged as accessibility
- **Thingiverse**: 3D printable assistive devices

### User Roles

- **Public**: Browse and search products
- **Authenticated**: Create collections, review products, submit content
- **Admin**: Moderate content, manage users, view analytics

## Deployment

The site is hosted on GitHub Pages. Production deploys are gated behind a version
tag — merging to `main` alone does **not** deploy:

```bash
git tag v1.2.3 && git push origin v1.2.3
```

Every pull request also gets a live preview at `https://a11yhood.org/pr-preview/<PR#>/`,
automatically deployed and cleaned up by CI.

See [DEPLOY.md](DEPLOY.md) for the full release process, PR preview details, and
required repository settings.

## Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Partners and Funders

Developed with support from:
- The Tides Foundation
- National Institute on Disability, Independent Living, and Rehabilitation Research (NIDILRR)
- Center for Research and Education on Accessible Technology and Experiences (CREATE)

In collaboration with:
- GitHub
- Grassroots Open Assistive Technology (GOAT)
- Center for Accessibility and Open Source (CAOS)

## License

BSD 3-Clause License - See [LICENSE](LICENSE) file for details.

## Links

- **Website**: [a11yhood.org](https://a11yhood.org)
- **Repository**: [github.com/a11yhood/a11yhood.github.io](https://github.com/a11yhood/a11yhood.github.io)
- **Issues**: [github.com/a11yhood/a11yhood.github.io/issues](https://github.com/a11yhood/a11yhood.github.io/issues)

---

*A11yhood is an open resource for everyone interested in accessible technology. Join us in making assistive technology more discoverable and accessible!*
