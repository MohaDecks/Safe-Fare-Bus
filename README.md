# SafeFare (Bus Ticket)

## Who uses what

| User | Platform | URL / App |
|------|----------|-----------|
| **Passenger** | **Flutter mobile app only** | `mobile/` |
| **Admin** | Web staff portal | http://localhost:4000/admin/ |
| **Cashier** | Web staff portal | http://localhost:4000/admin/ |
| **Employer** | Web staff portal | http://localhost:4000/admin/ |

Same login page on the portal — after sign-in, UI opens by role (admin / cashier / employer).

```
Passenger  →  Flutter app (wallet, QR pay, history)
Admin      →  Portal (routes, fares, buses, cashiers, revenue)
Cashier    →  Portal (QR fare session, today stats)
Employer   →  Portal (staff, allocate allowance)
```

## Quick start

### MongoDB + API + Portal

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

- API: http://localhost:4000/api  
- **Staff portal: http://localhost:4000/admin/**

### Passenger app (Flutter)

```bash
cd mobile
flutter pub get
flutter run
# Android emulator:
flutter run --dart-define=API_BASE=http://10.0.2.2:4000
```

## First-time setup (no seed)

All data is created from the **staff portal** and **mobile app** — nothing is auto-inserted.

1. Start API (`npm run dev`) and open http://localhost:4000/admin/
2. Create your first **Super Admin** in MongoDB (one time only), then sign in and use the portal:
   - **Staff roles** — add roles (cashier, passenger, etc.)
   - **Admin users** (Super Admin) — portal admins
   - **Staff** — cashiers, employers, employees
   - **Buses**, **QR**, **Top-up apps**, etc.

## Layout

```
Bus_Ticket/
  admin-portal/   Web — admin, cashier, employer
  backend/        Node.js + MongoDB
  mobile/         Flutter — passenger only
```
