# 🚀 DigitalFortune - Advanced Decentralized Trading Platform

<div align="center">

![Trading Platform](https://img.shields.io/badge/Trading-Platform-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)

**A full-stack, real-time cryptocurrency trading platform with professional-grade features**

[View Demo](#-features) · [Quick Start](#-quick-start) · [Tech Stack](#-tech-stack)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**DigitalFortune** is a sophisticated, production-ready cryptocurrency trading platform built with modern web technologies. This project demonstrates expertise in full-stack development, real-time systems, microservices architecture, and professional UI/UX design.

### 🌟 What Makes This Project Stand Out

- **Full-Stack Expertise**: Complete implementation from database to UI with TypeScript
- **Real-Time Trading**: WebSocket-based live market data and order execution
- **Microservices Architecture**: Scalable, containerized services with Docker
- **Professional UI/UX**: Eye-catching landing page with advanced animations (Framer Motion)
- **Enterprise Security**: JWT authentication, SQL injection prevention, encrypted passwords
- **Advanced Trading Features**: Leverage trading (up to 100x), margin management, risk engine
- **Production-Ready**: Docker orchestration, health checks, automated deployments

---

## ✨ Key Features

### 🎨 **Landing Page & UI**
- ✅ **Stunning Animations**: Framer Motion with 3D transforms, parallax scrolling, and particle effects
- ✅ **20+ Floating Particles**: Dynamic background with random motion paths
- ✅ **3D Dashboard Preview**: Interactive mockup with rotating glows and hover effects
- ✅ **Responsive Design**: Mobile-first approach with Tailwind CSS
- ✅ **Color-Coded Elements**: Visual hierarchy with gradient backgrounds
- ✅ **Smooth Transitions**: 60 FPS animations with GPU acceleration

### 💹 **Trading Dashboard**
- ✅ **Real-Time Charts**: Live candlestick charts with TradingView integration
- ✅ **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, 1D candle support
- ✅ **Order Management**: Market, limit, stop-loss, and take-profit orders
- ✅ **Position Tracking**: Real-time P&L calculation and position management
- ✅ **Leverage Trading**: Up to 100x leverage with margin calculations
- ✅ **Risk Management**: Automated liquidation engine and margin monitoring

### 🔐 **Authentication & Security**
- ✅ **JWT Authentication**: Secure token-based auth with refresh tokens
- ✅ **Password Encryption**: bcrypt hashing with salt rounds
- ✅ **SQL Injection Prevention**: Parameterized queries throughout
- ✅ **CORS Protection**: Configured cross-origin resource sharing
- ✅ **Rate Limiting**: API throttling to prevent abuse
- ✅ **Session Management**: Redis-based session storage

### 📊 **Real-Time Features**
- ✅ **WebSocket Connections**: Bidirectional real-time communication
- ✅ **Live Price Updates**: Sub-second market data streaming
- ✅ **Order Book**: Real-time bid/ask spreads
- ✅ **Trade Execution**: Instant order matching and fills
- ✅ **Balance Updates**: Live equity and margin calculations
- ✅ **Alert System**: Price alerts and liquidation warnings

### 🏗️ **Backend Architecture**
- ✅ **Microservices**: Separated HTTP, WebSocket, and Poller services
- ✅ **Risk Engine**: Real-time margin monitoring and liquidation
- ✅ **Market Simulation**: Mock market data with realistic volatility
- ✅ **Order Matching**: Professional-grade matching engine
- ✅ **Database Design**: Optimized PostgreSQL schema with indexes
- ✅ **Containerization**: Full Docker orchestration with docker-compose

### 📈 **Trading Engine**
- ✅ **Multiple Order Types**: Market, Limit, Stop-Loss, Take-Profit
- ✅ **Leverage System**: Dynamic leverage up to 100x
- ✅ **Margin Calculation**: Real-time free/used margin tracking
- ✅ **P&L Calculation**: Unrealized and realized profit tracking
- ✅ **Stop-Loss/Take-Profit**: Automated SL/TP watcher service
- ✅ **Liquidation Engine**: Automatic position closure on margin calls

---

## 🛠️ Tech Stack

### **Frontend**
```
React 19.1.1          - Latest React with concurrent features
TypeScript 5.7.2      - Type-safe development
Vite 7.1.4            - Lightning-fast build tool
Tailwind CSS 3.4.17   - Utility-first CSS framework
Framer Motion 11.15.0 - Advanced animations library
Zustand 5.0.8         - Lightweight state management
React Router 7.1.3    - Client-side routing
Lucide React          - Beautiful icon system
Lightweight Charts    - TradingView charting library
```

### **Backend**
```
Node.js 20            - JavaScript runtime
Express.js            - Web application framework
TypeScript 5.7.2      - Type-safe backend
PostgreSQL 14         - Relational database
Redis                 - Session & cache storage
WebSocket (ws)        - Real-time communication
JWT                   - Token-based authentication
bcrypt                - Password hashing
```

### **DevOps & Infrastructure**
```
Docker                - Containerization
Docker Compose        - Multi-container orchestration
Nginx                 - Web server & reverse proxy
GitHub Actions        - CI/CD (ready)
```

### **Architecture Patterns**
- ✅ **Microservices**: Service-oriented architecture
- ✅ **RESTful API**: Standard HTTP methods and status codes
- ✅ **WebSocket Protocol**: Real-time bidirectional communication
- ✅ **Repository Pattern**: Data access abstraction
- ✅ **Service Layer**: Business logic separation
- ✅ **DTO Pattern**: Data transfer objects for API
- ✅ **Middleware Pattern**: Request/response processing
- ✅ **Event-Driven**: Async processing with events

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Landing    │  │  Dashboard   │  │   Trading    │      │
│  │     Page     │  │     Page     │  │    Charts    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                     Nginx :80                                │
└────────────────────────────┼────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌────────▼────────┐
    │   HTTP SERVER     │         │   WS SERVER     │
    │   (Express.js)    │         │  (WebSocket)    │
    │   Port: 3001      │         │   Port: 3002    │
    │                   │         │                 │
    │ • REST API        │         │ • Live Quotes   │
    │ • Authentication  │         │ • Trade Events  │
    │ • Order Management│         │ • Real-time P&L │
    │ • Risk Engine     │         │ • Alerts        │
    └─────────┬─────────┘         └────────┬────────┘
              │                            │
              └──────────────┬─────────────┘
                             │
                   ┌─────────▼─────────┐
                   │    POLLER         │
                   │  (Background)     │
                   │                   │
                   │ • Market Data     │
                   │ • Price Updates   │
                   │ • Candle Builder  │
                   └─────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌────────▼────────┐
    │   PostgreSQL      │         │     Redis       │
    │   Port: 5432      │         │   Port: 6379    │
    │                   │         │                 │
    │ • Users           │         │ • Sessions      │
    │ • Orders          │         │ • Cache         │
    │ • Positions       │         │ • Real-time     │
    │ • Trades          │         │   Data          │
    └───────────────────┘         └─────────────────┘
```

### Service Breakdown

#### **1. Client (React + Vite)**
- Modern SPA with code splitting
- Real-time WebSocket connections
- Responsive trading dashboard
- Advanced animations with Framer Motion

#### **2. HTTP Server (Express.js)**
- RESTful API endpoints
- JWT authentication
- Order management
- Account operations
- Risk engine integration

#### **3. WebSocket Server**
- Real-time market data streaming
- Order execution events
- Live P&L updates
- Alert notifications

#### **4. Poller Service**
- Market data aggregation
- Candle generation
- Price simulation
- Background tasks

#### **5. PostgreSQL Database**
- User management
- Order history
- Position tracking
- Trade records

#### **6. Redis**
- Session storage
- Real-time cache
- Pub/sub messaging

---

## 🚀 Getting Started

### Prerequisites

- **Docker** (v20.10+) & **Docker Compose** (v2.0+)
- **Git**
- **Node.js 20+** (for local development)

### 📥 Quick Start (Recommended)

Clone and run with Docker:

```bash
# Clone the repository
git clone https://github.com/abdulbaqui17/DigitalFortune.git

# Navigate to project directory
cd DigitalFortune

# Start all services with Docker Compose
docker-compose up -d --build

# Wait 30 seconds for services to initialize
```

That's it! 🎉

**Access the application:**
- 🌐 **Frontend**: http://localhost
- 🔌 **API**: http://localhost:3001
- 📡 **WebSocket**: ws://localhost:3002

**Default User**: Every new signup gets **$5,000** demo balance!

---

## 📦 Installation Methods

### Method 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/abdulbaqui17/DigitalFortune.git
cd DigitalFortune

# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Method 2: Local Development

```bash
# Clone repository
git clone https://github.com/abdulbaqui17/DigitalFortune.git
cd DigitalFortune

# Install dependencies for all services
cd client && npm install && cd ..
cd httpserver && npm install && cd ..
cd wsserver && npm install && cd ..
cd poller && npm install && cd ..

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Start backend services (in separate terminals)
cd httpserver && npm run dev
cd wsserver && npm run dev
cd poller && npm run dev

# Start frontend (in another terminal)
cd client && npm run dev
```

### Method 3: Fork & Deploy

1. **Fork this repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/DigitalFortune.git
   ```
3. **Deploy to your server**:
   ```bash
   ssh your-server
   git clone https://github.com/YOUR_USERNAME/DigitalFortune.git
   cd DigitalFortune
   docker-compose up -d --build
   ```

---

## 📁 Project Structure

```
DigitalFortune/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── landing/      # Landing page components
│   │   │   │   ├── LandingNavbar.tsx
│   │   │   │   ├── HeroSection.tsx (with animations)
│   │   │   │   ├── FeaturesSection.tsx
│   │   │   │   ├── DashboardPreview.tsx (3D effects)
│   │   │   │   └── LandingFooter.tsx
│   │   │   ├── chart/        # Trading chart components
│   │   │   ├── orders/       # Order management UI
│   │   │   └── positions/    # Position tracking UI
│   │   ├── pages/
│   │   │   ├── Landing.tsx   # Landing page
│   │   │   └── Dashboard.tsx # Trading dashboard
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities & helpers
│   │   ├── store/            # Zustand state management
│   │   └── types/            # TypeScript definitions
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── httpserver/               # HTTP API Server
│   ├── src/
│   │   ├── index.ts          # Main server & routes
│   │   ├── riskEngine.ts     # Risk management
│   │   ├── sl_tp_watcher.ts  # Stop-loss/Take-profit watcher
│   │   ├── engine/
│   │   │   ├── margin.ts     # Margin calculations
│   │   │   └── simpleMargin.ts
│   │   ├── lib/
│   │   │   ├── liquidation.ts
│   │   │   ├── money.ts
│   │   │   └── risk.ts
│   │   └── risk/
│   │       ├── liquidation.ts
│   │       ├── liquidator.ts
│   │       └── snapshot.ts
│   ├── Dockerfile
│   └── package.json
│
├── wsserver/                 # WebSocket Server
│   ├── src/
│   │   ├── index.ts          # WebSocket handler
│   │   └── alerts.ts         # Alert system
│   ├── Dockerfile
│   └── package.json
│
├── poller/                   # Market Data Poller
│   ├── src/
│   │   └── index.ts          # Price polling & candles
│   ├── Dockerfile
│   └── package.json
│
├── db/
│   └── init.sql              # Database schema
│
├── docker-compose.yml        # Service orchestration
└── README.md                 # This file
```

---

## 📡 API Documentation

### Authentication Endpoints

#### `POST /api/v1/signup`
Register a new user (receives $5,000 demo balance).

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "trader123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "trader123"
  }
}
```

#### `POST /api/v1/signin`
Login existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

---

### Account Endpoints

#### `GET /api/v1/account`
Get account balance and margin info.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "balance": 5000.00,
  "equity": 5234.50,
  "free": 4500.00,
  "used": 734.50,
  "upnl": 234.50,
  "level": 712.5,
  "maintenance": 367.25
}
```

---

### Trading Endpoints

#### `POST /api/v1/orders`
Place a new order.

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "side": "buy",
  "type": "market",
  "quantity": 0.1,
  "leverage": 10,
  "stopLoss": 45000,
  "takeProfit": 55000
}
```

#### `GET /api/v1/orders`
Get open orders.

#### `GET /api/v1/positions`
Get open positions with P&L.

#### `POST /api/v1/positions/:id/close`
Close a position.

---

### Market Data Endpoints

#### `GET /api/v1/candles/:symbol`
Get historical candles.

**Query Params:**
- `interval`: 1m, 5m, 15m, 1h, 4h, 1d
- `limit`: Number of candles (default: 100)

---

### WebSocket Events

**Client → Server:**
```javascript
// Subscribe to market data
ws.send(JSON.stringify({
  type: 'subscribe',
  symbol: 'BTCUSDT'
}));
```

**Server → Client:**
```javascript
// Price update
{
  type: 'price',
  symbol: 'BTCUSDT',
  price: 43521.50,
  timestamp: 1699267200000
}

// Trade execution
{
  type: 'trade',
  orderId: 123,
  status: 'filled',
  price: 43521.50
}

// Position update
{
  type: 'position',
  positionId: 456,
  upnl: 234.50,
  roe: 4.69
}
```

---

## 💻 Development

### Available Scripts

#### Client
```bash
npm run dev          # Start dev server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

#### Backend Services
```bash
npm run dev          # Start with nodemon (auto-reload)
npm run build        # Compile TypeScript
npm start            # Start production server
```

### Environment Variables

Create `.env` files in each service directory:

**httpserver/.env:**
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/trading
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3001
REDIS_URL=redis://redis:6379
```

**wsserver/.env:**
```env
WS_PORT=3002
REDIS_URL=redis://redis:6379
```

---

## 🚢 Deployment

### Production Deployment

#### Option 1: VPS/Cloud Server

```bash
# On your server
git clone https://github.com/abdulbaqui17/DigitalFortune.git
cd DigitalFortune

# Configure environment variables
nano .env

# Build and start services
docker-compose -f docker-compose.yml up -d --build

# Setup Nginx reverse proxy (optional)
sudo nano /etc/nginx/sites-available/trading
```

**Sample Nginx config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

#### Option 2: Docker Swarm

```bash
docker swarm init
docker stack deploy -c docker-compose.yml trading
```

#### Option 3: Kubernetes

```bash
kubectl apply -f k8s/
```

---

## 📸 Screenshots

### Landing Page
- Eye-catching hero section with 20 floating particles
- Animated gradients and pulsing orbs
- 3D dashboard preview with parallax scrolling
- Feature cards with hover effects

### Trading Dashboard
- Real-time candlestick charts
- Order panel with leverage slider
- Position tracking with live P&L
- Balance display with margin info

---

## 🎓 What You'll Learn

By exploring this project, you'll understand:

1. **Full-Stack TypeScript Development**
   - Type-safe frontend and backend
   - Shared types between services
   - Advanced TypeScript patterns

2. **Real-Time Systems**
   - WebSocket implementation
   - Event-driven architecture
   - Live data streaming

3. **Microservices Architecture**
   - Service separation
   - Inter-service communication
   - Docker orchestration

4. **Advanced Frontend**
   - Complex state management
   - Real-time UI updates
   - Performance optimization
   - Advanced animations

5. **Trading Systems**
   - Order matching engines
   - Margin calculations
   - Risk management
   - Liquidation logic

6. **DevOps Practices**
   - Containerization
   - Multi-stage Docker builds
   - Service orchestration
   - Production deployment

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Contribution Ideas

- [ ] Add more cryptocurrency pairs
- [ ] Implement order book visualization
- [ ] Add trading indicators (RSI, MACD, etc.)
- [ ] Implement social trading features
- [ ] Add mobile app (React Native)
- [ ] Integrate real exchange APIs
- [ ] Add backtesting functionality
- [ ] Implement trading bots

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Abdul Baqui**

- GitHub: [@abdulbaqui17](https://github.com/abdulbaqui17)
- Project: [DigitalFortune](https://github.com/abdulbaqui17/DigitalFortune)

---

## 🙏 Acknowledgments

- TradingView for Lightweight Charts
- Framer Motion for animation library
- Tailwind Labs for Tailwind CSS
- Vercel for Zustand state management
- The open-source community

---

## 📊 Project Stats

- **Lines of Code**: ~15,000+
- **Components**: 40+
- **API Endpoints**: 20+
- **WebSocket Events**: 10+
- **Database Tables**: 8
- **Docker Services**: 6
- **Technologies Used**: 15+

---

## 🎯 Future Roadmap

- [ ] **Phase 1**: Real exchange integration (Binance API)
- [ ] **Phase 2**: Mobile app development
- [ ] **Phase 3**: Social trading features
- [ ] **Phase 4**: Algorithmic trading bots
- [ ] **Phase 5**: Copy trading functionality
- [ ] **Phase 6**: NFT marketplace integration

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

### 🔗 [Live Demo](#) | [Documentation](#) | [Issues](https://github.com/abdulbaqui17/DigitalFortune/issues)

**Built with ❤️ by Abdul Baqui**

</div>
