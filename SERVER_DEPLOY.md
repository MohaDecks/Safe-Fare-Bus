# SafeFare — Server Deploy (2.58.82.168)

## Waxa aad heli doonto

| Service | URL |
|---------|-----|
| Staff portal (admin/cashier) | http://2.58.82.168:4000/admin/ |
| API | http://2.58.82.168:4000/api |
| All APIs (HTML) | http://2.58.82.168:4000/api/docs |
| All APIs (JSON) | http://2.58.82.168:4000/api/routes |
| Passenger app | Mobile — connects to API above |

---

## Habka 1: Auto setup (Ubuntu/Debian)

SSH gal server-kaaga:

```bash
ssh root@2.58.82.168
```

Clone repo oo orod script-ka:

```bash
git clone https://github.com/MohaDecks/Safe-Fare-Bus.git /opt/safefare
cd /opt/safefare
sudo bash deploy/setup-server.sh
```

Script-ku wuxuu:
- rakibaa Node.js + MongoDB
- abuuraa `backend/.env` (JWT secret cusub)
- bilaabaa systemd service `safefare`

Hubi:

```bash
curl http://2.58.82.168:4000/api
```

---

## Habka 2: Manual

### 1. Server requirements

- Ubuntu 20.04+ ama Debian
- Node.js 18+
- MongoDB
- Port **4000** furan (firewall)

### 2. Clone & install

```bash
git clone https://github.com/MohaDecks/Safe-Fare-Bus.git /opt/safefare
cd /opt/safefare/backend
npm install --omit=dev
cp ../deploy/server.env.example .env
```

Edit `.env` — beddel `JWT_SECRET`:

```bash
nano .env
```

### 3. Start

```bash
cd /opt/safefare
chmod +x start-production.sh
./start-production.sh
```

Ama systemd (recommended):

```bash
sudo cp deploy/safefare.service /etc/systemd/system/
sudo systemctl enable safefare
sudo systemctl start safefare
```

### 4. Firewall

```bash
sudo ufw allow 4000/tcp
sudo ufw reload
```

---

## Mobile app (passenger)

Build APK oo u xidhiidh server-ka:

```bash
chmod +x build-mobile-production.sh
./build-mobile-production.sh apk
```

APK: `mobile/build/app/outputs/flutter-apk/app-release.apk`

Ama manually:

```bash
cd mobile
flutter build apk --dart-define=API_BASE=http://2.58.82.168:4000
```

---

## Troubleshooting

| Dhibaato | Xal |
|---------|-----|
| Ma xiri karo `http://2.58.82.168:4000` | Hubi firewall: `ufw allow 4000` |
| `MongoDB connection` error | `sudo systemctl start mongod` |
| Service ma socdo | `sudo journalctl -u safefare -f` |
| Port qabsan | `sudo lsof -i :4000` kadib kill |

---

## URLs summary

```
Staff portal:  http://2.58.82.168:4000/admin/
API health:    http://2.58.82.168:4000/api
API docs:      http://2.58.82.168:4000/api/docs
All routes:    http://2.58.82.168:4000/api/routes
Mobile API:    http://2.58.82.168:4000
```

## CORS

Browser clients (portal, web) use `CORS_ORIGINS` in `backend/.env`:

```
CORS_ORIGINS=http://2.58.82.168:4000,https://yourdomain.com
```

Mobile apps (Flutter) do not send `Origin` — they work without CORS issues.
