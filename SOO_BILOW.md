# SafeFare — sida loo ordo (Somali)

## 1. MongoDB

Hubi in MongoDB uu socdo (local ama Atlas).

## 2. Backend + Staff Portal (terminal 1)

```bash
cd /Volumes/O/Bus_Ticket
chmod +x start-backend.sh
./start-backend.sh
```

**Ha xirin terminal-kan.** Browser fur:

**http://localhost:4000/admin/**

**Ma jiro seed / demo** — wax walba waxaad ka abuurtaa portal-ka (Staff roles, Staff, Buses, QR, iwm).

| Tallaabo | Meel |
|----------|------|
| 1 | MongoDB — abuur Super Admin koowaad (hal mar) |
| 2 | Portal → **Staff roles** |
| 3 | **Staff** → diiwaangeli shaqaalaha |
| 4 | **Buses**, **QR**, **Top-up apps** |

Haddii port 4000 qabsan yahay:

```bash
kill $(lsof -t -i:4000)
./start-backend.sh
```

## 3. Passenger app — Flutter (terminal 2)

```bash
cd /Volumes/O/Bus_Ticket
chmod +x start-app.sh
./start-app.sh
```

Passenger waa in admin uu **Staff** ka abuuro (role mobile).

## Khaladaha caadiga ah

| Dhibaato | Xal |
|---------|-----|
| `EADDRINUSE` port 4000 | `kill $(lsof -t -i:4000)` kadib `./start-backend.sh` |
| Portal madhan / caddaan | Hubi URL: `http://localhost:4000/admin/` maahan fayl folder |
| App ma xiri karo API | Backend waa inuu socdaa; macOS: `./start-app.sh` |
| `cd mobile` laba jeer | Hal mar kaliya: `cd /Volumes/O/Bus_Ticket/mobile` |

## Qaabka mashruuca

- **Portal (web):** admin, cashier, employer  
- **App (Flutter):** passenger kaliya  

## Server deploy (2.58.82.168)

Haddii aad rabto inaad server-kaaga ku orodiso:

```bash
ssh root@2.58.82.168
git clone https://github.com/MohaDecks/Safe-Fare-Bus.git /opt/safefare
cd /opt/safefare
sudo bash deploy/setup-server.sh
```

Kadib fur browser: **http://2.58.82.168:4000/admin/**

Faahfaahin: `SERVER_DEPLOY.md`
