# AIrium UI Module

This is the frontend UI module for AIrium, built with Astro 5.13.7 SSG and React 19.

## Features

- **Astro 5.13.7 SSG**: Latest Astro version with enhanced performance, improved dev server, and better TypeScript support
- **React 19**: Latest React version with enhanced features and improved concurrent rendering
- **Tailwind CSS**: Utility-first CSS framework with design system integration
- **ShadCN Components**: High-quality UI components with accessibility features
- **Responsive Design**: Mobile-first responsive design across all device types
- **Amplify Integration**: Optimized for AWS Amplify hosting with SSG deployment

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # ShadCN UI components
│   └── layout/         # Layout components
├── layouts/            # Astro layouts
├── pages/              # Astro pages
├── styles/             # Global styles
└── lib/                # Utilities and helpers
```

## Deployment

The UI module is configured for deployment on AWS Amplify using the `amplify.yml` configuration file. It will be hosted at `https://devposthackathon.tojf.link`.

## Integration with Core Module

The UI module imports configuration from the Core module's `amplify_outputs.json` file for seamless integration with the backend services.