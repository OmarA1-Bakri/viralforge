# Suggested Commands

## Development
```bash
# Start dev server (hot reload)
npm run dev

# Type check without emitting
npm run check

# Build for production
npm run build

# Start production server
npm start
```

## Database
```bash
# Push schema changes to database
npm run db:push

# Run database migrations
npm run db:migrate
```

## Testing
```bash
# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage
```

## Mobile Development
```bash
# Sync Capacitor plugins and copy web assets
npx cap sync

# Open Android Studio
npx cap open android

# Open Xcode
npx cap open ios

# Quick mobile dev setup
./mobile-dev.sh
```

## Python (AI Agents)
```bash
# Install Python dependencies
pip3 install -r requirements.txt

# Run AI agent system directly
python3 server/agents/viral_crew.py

# Test TikTok scraper
python3 server/scripts/tiktok_scraper.py
```

## Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## Useful System Commands (Linux)
```bash
# Find files
find . -name "*.ts" -type f

# Search in files
grep -r "search_term" .

# Check processes
ps aux | grep node

# Check port usage
lsof -i :5000

# Git operations
git status
git add .
git commit -m "message"
git push

# File operations
ls -la
cat filename
less filename
tail -f logs/app.log
```
