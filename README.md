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
# Works for Linux/Mac only 
curl -fsSL https://pixi.sh/install.sh | bash
```

Verify installation:

```bash
pixi --version
```
### Using Pixi

Pixi provides the pinned Node version and the project tasks defined in `pixi.toml` (`pixi task list` shows them all). Prefer `pixi run <task>`; inside `pixi shell` the equivalent npm scripts also work. See [DEVELOPMENT.md](DEVELOPMENT.md) for the full local-development guide.

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
   pixi run install-dev
   ```

3. **Set up environment variables**

   Minimal `.env.local` for local development:
   ```env
   VITE_DEV_MODE=true
   VITE_DEV_USER=admin
   ```

   Production auth flows require Supabase values:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   See `env.example` and `env.example.test` for full configuration options.

4. **Start the development server**
   ```bash
   pixi run dev
   ```

   The application will be available at `https://localhost:5173` (Vite picks the next free port if it is taken; the URL is printed in the terminal).

### Running Tests

```bash
pixi run test          # reduced Vitest suite (same as PR preview CI)
pixi run test-full     # full suite (integration tests need a running backend)
pixi run lint          # ESLint

# Other test commands, from inside `pixi shell`:
npm test                       # watch mode
npm run test:coverage          # with coverage
npm run test:ui                # with Vitest UI
npm run test:a11y              # accessibility tests
npm run test:a11y:integration  # accessibility integration tests (need a backend)
```

Notes:
- Unit tests can run without Supabase variables.
- Integration tests require a running backend and valid dev auth mode (`VITE_DEV_MODE=true`).

### Building for Production

```bash
pixi run build-vite      # production bundle only (dist/); skips tests and type-checking
pixi run build-ghpages   # reduced tests, type-check, then bundle (what deploys use)
pixi run preview         # build the bundle and serve it locally on https://localhost:4173
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

Products gathered through such scraping receive an initial review that is based on their stars on their respective platforms. For ravelry, this is simply its rating out of 5 from Ravelry. For Github and Thingiverse, however, there is no such analagous metric. For these, the initial rating is a mapping based on the number of users who have starred the product on the source site. This initial score mapping is exponential and the highest scores (e.g. 5.0) map to 100,000 or more stars on Github, and 1,000 or more stars on Thingiverse (a scale representative of extreme popularity on each respective site). Thus, many products start with ratings that appear low: this is meant to estimate overall community interest rather than act as an indictment on a product's usefulness or quality. Users' ratings of products on the a11yhood site will update this overall rating.

### User Roles

- **Public**: Browse and search products
- **Authenticated**: Create collections, review products, submit content
- **Admin**: Moderate content, manage users, view analytics

## Deployment

The site is hosted on Vercel. Production deploys are gated behind a version
tag — merging to `main` alone does **not** deploy. Every branch or pull request
gets its own preview deployment, and pull requests also run lint, tests, and
accessibility checks in CI.

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for domains and DNS,
environment variables, social link previews, rollback, and release
verification.

### Full Backend Test Validation

The full backend-capable suite is intentionally manual-triggered:

- Internal PRs: add label `run-full-backend` to trigger [`.github/workflows/backend-tests.yml`](.github/workflows/backend-tests.yml).
- Fork PRs: maintainers can comment `/run-full-backend`; [`.github/workflows/full-backend-from-comment.yml`](.github/workflows/full-backend-from-comment.yml) dispatches the full suite on the PR merge ref.

This pattern avoids exposing repository secrets to untrusted fork events while preserving pre-merge backend validation.

## Copilot Accessibility Setup

This repository uses both custom instructions and custom agents for
accessibility-focused development.

### Always-on instructions

- Repository-wide instructions: [.github/copilot-instructions.md](.github/copilot-instructions.md)
- Markdown-specific instructions: [.github/instructions/markdown-accessibility.instructions.md](.github/instructions/markdown-accessibility.instructions.md)

### Custom agents

- Markdown accessibility assistant:
   [.github/agents/markdown-a11y-assistant.agent.md](.github/agents/markdown-a11y-assistant.agent.md)
- Accessibility review advisor:
   [.github/agents/a11y-review-advisor.agent.md](.github/agents/a11y-review-advisor.agent.md)

### GitHub-hosted agent setup

- Setup workflow for GitHub agent runs:
   [.github/workflows/copilot-setup-steps.yml](.github/workflows/copilot-setup-steps.yml)

Use this setup when you want Copilot to apply repo accessibility standards
consistently and delegate focused accessibility tasks to specialized agents.

## Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

For contribution norms, review expectations, and release conventions across A11yhood,
see the community guide: [Community CONTRIBUTING.md](https://github.com/a11yhood/community/blob/main/CONTRIBUTING.md).

When opening a pull request in this repository, complete the accessibility checklist
in [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).

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
