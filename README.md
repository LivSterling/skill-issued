# Skill Issued 🎮

A social gaming platform where you can review games you've played, see what your friends have been playing, and discover new games based on their suggestions. Track your gaming journey, save games you want to play, and tell your friends what's good.

## ✨ Features

### 🎯 Game Discovery & Management
- **Browse & Search**: Discover games from RAWG.io's database of 500,000+ games
- **Advanced Filtering**: Filter by genre, platform, release year, and rating
- **Game Tracking**: Mark games as "want to play", "playing", "completed", or "dropped"
- **Personal Library**: Build and manage your gaming library with ratings and reviews
- **Game Reviews**: Write detailed reviews and rate games on a 5-star scale

### 👥 Social Features
- **Friend System**: Connect with friends and see their gaming activity
- **Follow Users**: Follow other gamers to discover new games
- **Social Feed**: View what your friends are playing and their latest reviews
- **Profile Sharing**: Share your gaming profile and achievements

### 🔐 User Profiles & Authentication
- **Secure Authentication**: Email/password and social login (Google, Discord)
- **Rich Profiles**: Create detailed gaming profiles with preferences and bio
- **Privacy Controls**: Manage what information is visible to others
- **Gaming Preferences**: Set favorite genres and platforms for personalized recommendations

### ⚡ Performance & User Experience
- **Fast Loading**: Intelligent caching and lazy loading for optimal performance
- **Real-time Updates**: Instant updates when you interact with games
- **Responsive Design**: Seamless experience across desktop and mobile
- **Error Handling**: Graceful fallbacks when services are unavailable

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Game Data**: RAWG.io API
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account
- RAWG.io API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/skill-issued.git
   cd skill-issued
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # RAWG API
   RAWG_API_KEY=your_rawg_api_key
   
   # Next.js
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Set up the database**
   
   Run the Supabase migrations:
   ```bash
   npx supabase db reset
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
skill-issued/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── games/             # Game-related pages
│   ├── profile/           # User profile pages
│   └── search/            # Search functionality
├── components/            # Reusable React components
│   ├── auth/              # Authentication components
│   ├── games/             # Game-related components
│   ├── profile/           # Profile components
│   └── ui/                # UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and services
│   ├── database/          # Database types and queries
│   ├── services/          # External API services
│   ├── supabase/          # Supabase client configuration
│   └── validations/       # Form validation schemas
├── supabase/              # Database migrations and seeds
└── tasks/                 # Project documentation and PRDs
```

## 🎮 Key Features in Detail

### Game Data Integration
- **RAWG API Integration**: Access to comprehensive game database with ratings, screenshots, and metadata
- **Smart Caching**: Local database caching to minimize API calls and improve performance
- **Data Synchronization**: Periodic updates to keep game information current

### User Game Management
- **Status Tracking**: Track your progress through different game states
- **Rating System**: Rate games on a 5-star scale with difficulty ratings
- **Review System**: Write detailed reviews to share your experience
- **Playtime Tracking**: Log hours played for better gaming insights

### Social Discovery
- **Friend Recommendations**: Discover games based on what your friends are playing
- **Activity Feed**: See recent gaming activity from your network
- **Profile Browsing**: Explore other users' gaming libraries and reviews

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Database Migrations

To create a new migration:
```bash
npx supabase migration new migration_name
```

To apply migrations:
```bash
npx supabase db reset
```

## 📊 API Usage & Limits

### RAWG API
- **Free Tier**: 20,000 requests/month
- **Rate Limiting**: Implemented to respect API limits
- **Caching Strategy**: Intelligent caching to minimize API calls

### Performance Optimizations
- Local database caching for popular games
- Image lazy loading and CDN optimization
- Request debouncing for search functionality
- Virtual scrolling for large game lists

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [RAWG.io](https://rawg.io/) for providing comprehensive game data
- [Supabase](https://supabase.com/) for backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Next.js](https://nextjs.org/) for the amazing React framework

## 📞 Support

If you have any questions or run into issues, please:
1. Check the [Issues](https://github.com/yourusername/skill-issued/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Built with ❤️ for gamers, by gamers**
