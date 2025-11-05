# 🚀 DigitalFortune - Crypto Trading Platform# 🚀 DigitalFortune - Real-Time Crypto Trading Platform



<div align="center"><div align="center">



![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)

![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)

![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)



**Full-stack real-time cryptocurrency trading platform built with React, TypeScript, and microservices****Full-stack cryptocurrency trading platform with real-time features and microservices architecture**



</div></div>



------



## ⚡ Quick Start## ⚡ Quick Start



```bash```bash

git clone https://github.com/abdulbaqui17/DigitalFortune.gitgit clone https://github.com/abdulbaqui17/DigitalFortune.git

cd DigitalFortunecd DigitalFortune

docker-compose up -d --builddocker-compose up -d --build

``````



Open **http://localhost** → Sign up → Get **$5,000** demo balance → Start trading!Open **http://localhost** - Every new user gets **$5,000** demo balance!



------



## ✨ Features## ✨ Key Features



**Trading**### Trading

- Real-time candlestick charts (1m to 1D timeframes)- Real-time candlestick charts with multiple timeframes

- Market, limit, stop-loss, take-profit orders- Market, limit, stop-loss, and take-profit orders

- Up to 100x leverage with margin tracking- Up to 100x leverage trading

- Live P&L and position management- Live P&L tracking and position management

- Automated liquidation system- Automated liquidation engine



**Tech Highlights**### Technical

- JWT authentication + bcrypt encryption- JWT authentication with bcrypt password hashing

- WebSocket real-time data streaming- WebSocket real-time data streaming

- Microservices architecture (6 containers)- Microservices architecture (HTTP, WS, Poller services)

- PostgreSQL + Redis persistence- PostgreSQL + Redis for data persistence

- Framer Motion landing page animations- Framer Motion animations on landing page

- Responsive design with Tailwind CSS



---

---

## 🛠️ Tech Stack

## 🛠️ Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand  

**Backend:** Node.js, Express.js, TypeScript, WebSocket  **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand  

**Database:** PostgreSQL, Redis  **Backend:** Node.js, Express.js, TypeScript, WebSocket  

**DevOps:** Docker, Docker Compose, Nginx**Database:** PostgreSQL, Redis  

**DevOps:** Docker, Docker Compose, Nginx

---

## �️ Architecture

## 🏗️ Architecture

Microservices setup with 6 Docker containers:

```- **Client** - React SPA with Nginx

┌─────────────┐- **HTTP Server** - REST API, auth, orders (Express.js)

│  React SPA  │ (Nginx :80)- **WebSocket Server** - Real-time data streaming

└──────┬──────┘- **Poller** - Market data aggregation

       │- **PostgreSQL** - User accounts, orders, positions

   ┌───┴────────────┬─────────────┐- **Redis** - Session cache

   │                │             │

┌──▼───────┐  ┌────▼────┐  ┌─────▼─────┐## � Development

│ HTTP API │  │ WebSocket│  │  Poller   │

│ :3001    │  │  :3002  │  │ (Background)│```bash

└────┬─────┘  └────┬────┘  └─────┬─────┘# Start dev environment

     │             │              │docker-compose up -d

     └─────────┬───┴──────────────┘

               │# View logs

        ┌──────┴──────┐docker-compose logs -f httpserver

        │             │

   ┌────▼────┐  ┌────▼────┐# Stop services

   │PostgreSQL│  │  Redis  │docker-compose down

   │  :5432  │  │  :6379  │```

   └─────────┘  └─────────┘

```---



**Services:**## 📁 Project Structure

- **Client** - React SPA with landing page + trading dashboard

- **HTTP Server** - REST API, auth, order management, risk engine```

- **WebSocket Server** - Real-time price updates and trade eventsDigitalFortune/

- **Poller** - Market data aggregation and candle generation├── client/                    # React Frontend

- **PostgreSQL** - User accounts, orders, positions│   ├── src/

- **Redis** - Session storage and caching│   │   ├── components/       # Reusable components

│   │   │   ├── landing/      # Landing page components

---│   │   │   │   ├── LandingNavbar.tsx

│   │   │   │   ├── HeroSection.tsx (with animations)

## 📁 Project Structure│   │   │   │   ├── FeaturesSection.tsx

│   │   │   │   ├── DashboardPreview.tsx (3D effects)

```│   │   │   │   └── LandingFooter.tsx

DigitalFortune/│   │   │   ├── chart/        # Trading chart components

├── client/          # React frontend (Vite + TypeScript)│   │   │   ├── orders/       # Order management UI

├── httpserver/      # Express.js API server│   │   │   └── positions/    # Position tracking UI

├── wsserver/        # WebSocket server│   │   ├── pages/

├── poller/          # Market data poller│   │   │   ├── Landing.tsx   # Landing page

├── db/              # PostgreSQL init scripts│   │   │   └── Dashboard.tsx # Trading dashboard

└── docker-compose.yml│   │   ├── hooks/            # Custom React hooks

```│   │   ├── lib/              # Utilities & helpers

│   │   ├── store/            # Zustand state management

---│   │   └── types/            # TypeScript definitions

│   ├── Dockerfile

## 🔧 Development│   ├── package.json

│   └── vite.config.ts

```bash│

# Start all services├── httpserver/               # HTTP API Server

docker-compose up -d│   ├── src/

│   │   ├── index.ts          # Main server & routes

# View logs│   │   ├── riskEngine.ts     # Risk management

docker-compose logs -f httpserver│   │   ├── sl_tp_watcher.ts  # Stop-loss/Take-profit watcher

│   │   ├── engine/

# Rebuild specific service│   │   │   ├── margin.ts     # Margin calculations

docker-compose up -d --build client│   │   │   └── simpleMargin.ts

│   │   ├── lib/

# Stop everything│   │   │   ├── liquidation.ts

docker-compose down│   │   │   ├── money.ts

```│   │   │   └── risk.ts

│   │   └── risk/

**Access Points:**│   │       ├── liquidation.ts

- Frontend: http://localhost│   │       ├── liquidator.ts

- API: http://localhost:3001│   │       └── snapshot.ts

- WebSocket: ws://localhost:3002│   ├── Dockerfile

│   └── package.json

---│

├── wsserver/                 # WebSocket Server

## 📦 What's Inside│   ├── src/

│   │   ├── index.ts          # WebSocket handler

**Landing Page**│   │   └── alerts.ts         # Alert system

- Eye-catching hero with 20+ floating particles│   ├── Dockerfile

- Feature cards with hover animations│   └── package.json

- 3D dashboard preview with parallax scrolling│

- Mobile-responsive design├── poller/                   # Market Data Poller

│   ├── src/

**Trading Dashboard**│   │   └── index.ts          # Price polling & candles

- Left sidebar: Instrument list│   ├── Dockerfile

- Center: Real-time charts + positions panel│   └── package.json

- Right sidebar: Order panel with leverage slider│

- Live balance and margin display├── db/

│   └── init.sql              # Database schema

**Backend**│

- JWT auth with 7-day token expiration├── docker-compose.yml        # Service orchestration

- User-specific order isolation└── README.md                 # This file

- Real-time margin monitoring```

- Automated stop-loss/take-profit execution

- Liquidation engine triggers at 0% margin---



---## 📡 API Documentation



## 🚀 Deployment### Authentication Endpoints



### Docker (Recommended)#### `POST /api/v1/signup`

```bashRegister a new user (receives $5,000 demo balance).

# On your server

git clone https://github.com/abdulbaqui17/DigitalFortune.git**Request:**

cd DigitalFortune```json

docker-compose up -d --build{

```  "email": "user@example.com",

  "password": "securePassword123",

### Manual  "username": "trader123"

```bash}

# Install dependencies```

cd client && npm install && cd ..

cd httpserver && npm install && cd ..**Response:**

cd wsserver && npm install && cd ..```json

cd poller && npm install && cd ..{

  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",

# Start services  "user": {

docker-compose up -d postgres redis    "id": 1,

cd httpserver && npm start &    "email": "user@example.com",

cd wsserver && npm start &    "username": "trader123"

cd poller && npm start &  }

cd client && npm run build && npx serve dist}

``````



---#### `POST /api/v1/signin`

Login existing user.

## 🤝 Contributing

**Request:**

1. Fork the repo```json

2. Create feature branch (`git checkout -b feature/amazing`){

3. Commit changes (`git commit -m 'Add amazing feature'`)  "email": "user@example.com",

4. Push to branch (`git push origin feature/amazing`)  "password": "securePassword123"

5. Open Pull Request}

```

---

---

## 📄 License

### Account Endpoints

MIT License - feel free to use for your projects!

#### `GET /api/v1/account`

---Get account balance and margin info.



## 👨‍💻 Author**Headers:** `Authorization: Bearer {token}`



**Abdul Baqui**  **Response:**

GitHub: [@abdulbaqui17](https://github.com/abdulbaqui17)```json

{

---  "balance": 5000.00,

  "equity": 5234.50,

<div align="center">  "free": 4500.00,

  "used": 734.50,

### ⭐ Star this repo if you find it helpful!  "upnl": 234.50,

  "level": 712.5,

Built with ❤️ using React, TypeScript, and Docker  "maintenance": 367.25

}

</div>```


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
