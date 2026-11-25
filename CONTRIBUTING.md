# Contributing to KisanSAATHI

Thank you for contributing to **KisanSAATHI**. Please follow these engineering and SDLC standards when submitting changes.

---

## 1. Development Workflow

1. Create a feature or bugfix branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Keep secrets out of version control. Never commit `.env` files, API keys, or private credentials. Use `.env.example` when adding new configuration keys.
3. Follow the existing modular structure:
   - UI screens in `screens/` (grouped by role/domain: `auth/`, `b2c/`, `customer/`, `mandi/`, `web3/`, `admin/`).
   - Business logic and persistence in `services/`.
   - Smart contracts in `contracts/`.
   - Automated tests in `tests/`.

---

## 2. UI & Code Quality Standards

- **No Emojis in UI/Code:** Use `@expo/vector-icons` (`MaterialCommunityIcons`) and clean typography instead of Unicode emojis.
- **Offline-First Resilience:** Ensure user actions (profile edits, B2C chats, Web3 ledger actions, notifications) persist locally via `AsyncStorage` and never block the UI on remote network timeouts.
- **Multilingual Awareness:** Support both Hindi (`hi`) and English (`en`) labels for user-facing strings.

---

## 3. Pre-Commit Verification Checklist

Before opening a pull request, verify that all checks pass locally:

```bash
npm run lint:syntax
npm test
```

Ensure any new services or screens are covered by assertions in `tests/runTests.js`, and update `README.md` or `docs/SDLC_SPECIFICATION.md` if you add new routes, endpoints, or environment variables.
