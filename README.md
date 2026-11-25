# KisanSAATHI — Your Digital Krishi Officer

**KisanSAATHI** is a unified agricultural ecosystem designed for Indian farmers, retail consumers/bulk buyers, and APMC mandi owners. It combines hyper-local agronomic intelligence, real-time 2026 mandi price discovery, an AI agricultural assistant with live Wikipedia web scanning, a direct B2C marketplace with 1-on-1 negotiation chat, and Web3 crop provenance with smart contract escrow.

---

## Key Features

### 1. Multi-Role Authentication & Dashboards
- **Farmer Role:** Weather telemetry, spraying and irrigation advisories, live mandi rates, Krishi Sahayak AI, direct B2C selling, and Web3 harvest passports.
- **Customer / Buyer Role:** Kisan Direct B2C retail marketplace (`25 kg`, `50 kg`, `100 kg / 1 Quintal` lots), wholesale produce browsing, purchase offer bidding, and direct 1-on-1 farmer chat.
- **Mandi Owner / APMC Trader Role:** Daily arrival logging, rate board broadcasting, and incoming buyer inquiry management.

### 2. Smart Weather & Agronomic Advisory
- Automatic GPS detection and reverse geocoding (OpenStreetMap Nominatim) with manual district search across India.
- Live weather parameters powered by Open-Meteo.
- Actionable advisories for pesticide spraying windows, soil- and crop-specific irrigation planning, and weather risk alerts.

### 3. Live Mandi Intelligence & 2026 Benchmarks
- Pan-India APMC mandi rate discovery categorized across cereals, pulses, oilseeds, vegetables, and fruits.
- **"Best Price" (सर्वोत्तम भाव)** primary sorting and **"Better Deals"** freight-deducted net realization calculator.
- Grounded with 2026 MSP and APMC modal benchmarks (including Soybean 2026 MSP ₹4,892/Q and modal ₹5,120/Q).

### 4. Krishi Sahayak AI & Live Wikipedia Web Scanner
- Voice, text, and multimodal photo-based crop diagnosis powered by OpenAI (`gpt-4o-mini` and Realtime API).
- **Live Wikipedia Web Scanner:** Dynamically queries English and Hindi Wikimedia Action APIs in real time, injects verified encyclopedic facts into the AI context, and displays source attribution badges.
- **2026 Temporal Grounding:** Eliminates outdated knowledge-cutoff disclaimers for current agricultural pricing queries.

### 5. Kisan Direct (B2C) & 1-on-1 Negotiation Chat
- Enables farmers to sell directly to households and local businesses in `25 kg`, `50 kg`, and `100 kg (1 Quintal)` lots with transparent `₹/kg`, `₹/50kg`, and `₹/Quintal` pricing.
- **Direct Farmer-Customer Chat:** Features a sticky deal context bar, one-tap negotiation chips, simulated farmer dialogue replies, and an interactive **Confirm Deal** flow.

### 6. Real-Time Agricultural Notification Center
- Interactive header bell icon with unread count badge.
- Categorized alerts (`All`, `Mandi`, `Weather`, `Deals`) with one-tap deep navigation and **Mark all read** support.

### 7. Web3 Agri-Chain & Smart Contract Escrow
- **Agri-Wallet Connection:** Supports browser EVM wallets (`window.ethereum` / MetaMask) with a deterministic gasless Agri-Wallet fallback on `Polygon Amoy Agri-Chain`.
- **On-Chain Crop Passports:** Immutable harvest provenance records with transaction hashes, block numbers, and farm-to-fork milestones.
- **Smart Contract Escrow:** Solidity contract (`contracts/KisanEscrowTraceability.sol`) and in-app escrow locking/release for B2C farmer-customer deals.

### 8. Automated Wikipedia Data Scraper (Admin)
- Internal administration interface (`screens/admin/DataScraperScreen.js`) for searching Wikimedia APIs, extracting structured agricultural records via OpenAI, tracking revisions with SHA-256 hashes, and approving records into the knowledge store.

---

## Project Structure

```text
kisan seva/
├── .github/workflows/ci.yml           # GitHub Actions CI pipeline (syntax + unit tests)
├── contracts/
│   └── KisanEscrowTraceability.sol    # Solidity smart contract for provenance & escrow
├── docs/
│   └── SDLC_SPECIFICATION.md          # 6-phase SDLC specification document
├── screens/
│   ├── admin/DataScraperScreen.js     # Admin Wikipedia + OpenAI extraction bot UI
│   ├── auth/                          # AuthEntry, RoleSelect, Login, Register
│   ├── b2c/                           # B2CMarketplace, B2CChatsList, B2CChatDetail
│   ├── customer/                      # CustomerTab, Home, Browse, Offers, History, Profile
│   ├── mandi/                         # MandiOwnerTab, Overview, Prices, Enquiries, History, Profile
│   ├── web3/Web3TraceabilityScreen.js # Web3 wallet, crop passports, and escrow hub
│   ├── ChatScreen.js                  # Krishi Sahayak AI chat & voice mode
│   ├── HomeScreen.js                  # Farmer dashboard, weather, advisory & notifications
│   ├── MarketScreen.js                # Live APMC mandi rates & freight calculator
│   └── ProfileScreen.js               # Farmer profile, 22 languages, admin & Web3 links
├── services/
│   ├── AuthContext.js & authService.js
│   ├── b2cMarketService.js            # B2C small-lot listings & 1-on-1 chat persistence
│   ├── marketService.js               # Mandi rates & 2026 crop catalogue
│   ├── notificationService.js         # Agricultural alerts & unread tracking
│   ├── scraperService.js              # Scraper client service
│   └── web3Service.js                 # Agri-Wallet, crop passports & smart escrow
├── tests/
│   └── runTests.js                    # Automated SDLC test suite (node:test)
├── voice-server/
│   └── server.js                      # Express backend for /chat, /realtime/session & /scraper/*
├── .env.example                       # Environment variables template
├── App.js                             # Role-based root navigation
├── firestore.rules                    # Cloud Firestore security rules
├── package.json                       # App dependencies and QA scripts
├── PROJECT_DOCUMENTATION.md           # Functional & architectural documentation (English)
└── PROJECT_DOCUMENTATION.pdf          # Printable PDF project documentation
```

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm
- Expo CLI / Expo Go or Android Dev Client

### 1. Environment Setup
Copy `.env.example` to `.env` and configure your keys:
```bash
cp .env.example .env
```
Update `OPENAI_API_KEY` in `.env` (and `voice-server/.env` if running separately).

### 2. Install Dependencies
```bash
npm install
cd voice-server && npm install && cd ..
```

### 3. Start the Backend AI & Scraper Server
```bash
node "voice-server/server.js"
```
The backend listens on `http://localhost:3001`.

### 4. Start the Expo Application
- **Web:**
  ```bash
  npx expo start --web
  ```
- **Mobile Dev Client (QR Code):**
  ```bash
  npx expo start --dev-client
  ```

---

## SDLC Quality Assurance & Testing

This repository follows a structured 6-phase SDLC workflow documented in `docs/SDLC_SPECIFICATION.md` and enforced via GitHub Actions (`.github/workflows/ci.yml`).

Run the syntax check and automated test suite locally:
```bash
npm run lint:syntax
npm test
```

---

## Documentation
- [Functional Project Documentation (Markdown)](./PROJECT_DOCUMENTATION.md)
- [Functional Project Documentation (PDF)](./PROJECT_DOCUMENTATION.pdf)
- [SDLC Specification](./docs/SDLC_SPECIFICATION.md)
