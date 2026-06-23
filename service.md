# PalCord as a Service

This guide explains how to run PalCord as a background service on Linux (systemd) and Windows.

---

## Linux (systemd)

### 1. Create a Service User

```bash
sudo useradd -r -s /bin/false palcord
sudo usermod -a -G palcord $(whoami)
```

### 2. Move Project to /opt

```bash
sudo mv /path/to/palcord /opt/palcord
sudo chown -R palcord:palcord /opt/palcord
```

### 3. Install Node.js and Dependencies

```bash
cd /opt/palcord
sudo -u palcord npm install
sudo -u palcord cp .env.example .env
# Edit .env with your credentials
sudo -u palcord nano .env
```

### 4. Create the systemd Service

Create `/etc/systemd/system/palcord.service`:

```ini
[Unit]
Description=PalCord Discord Bot & Dashboard
After=network.target

[Service]
Type=simple
User=palcord
Group=palcord
WorkingDirectory=/opt/palcord
ExecStart=/usr/bin/node /opt/palcord/src/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

> Adjust `ExecStart` if your entry point is different, e.g. `/opt/palcord/index.js`.

### 5. Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable palcord
sudo systemctl start palcord
sudo systemctl status palcord
```

### 6. View Logs

```bash
sudo journalctl -u palcord -f
```

---

## Linux (PM2)

If you prefer process management with PM2:

```bash
sudo npm install -g pm2
cd /opt/palcord
pm2 start src/index.js --name palcord
pm2 save
pm2 startup
```

---

## Windows

### Option 1: NSSM (Recommended)

1. Download NSSM from https://nssm.cc/download
2. Extract `nssm.exe` and place it in a folder in your PATH
3. Open an Administrator Command Prompt

```cmd
nssm install PalCord
```

In the GUI:
- **Path**: `C:\Program Files\nodejs\node.exe`
- **Startup directory**: `C:\palcord`
- **Arguments**: `C:\palcord\src\index.js`

Then:

```cmd
nssm start PalCord
nssm status PalCord
```

### Option 2: Windows Task Scheduler

1. Create a batch file `C:\palcord\start.bat`:

```batch
@echo off
cd /d C:\palcord
node src\index.js
```

2. Open Task Scheduler
3. Create Basic Task
4. Trigger: When I log on / At startup
5. Action: Start a program
6. Program: `C:\palcord\start.bat`
7. Enable **Run with highest privileges** and **Run whether user is logged on or not**

---

## Updating

### Linux (systemd)

```bash
cd /opt/palcord
sudo -u palcord git pull
sudo -u palcord npm install
sudo systemctl restart palcord
```

### Windows (NSSM)

```cmd
cd C:\palcord
git pull
npm install
nssm restart PalCord
```

---

## Reverse Proxy (optional)

If you run PalCord behind Nginx or another reverse proxy, make sure the proxy forwards to the local port:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5996;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

For HTTPS use Certbot or your preferred certificate provider.

---

## Troubleshooting

- **Port already in use**: Change `APP_PORT` in `.env` or stop the conflicting service.
- **Permission denied**: Make sure the service user owns the project directory.
- **Bot not responding**: Check the logs and verify `DISCORD_TOKEN` and intents.
- **Dashboard not reachable**: Verify firewall rules and `APP_URL` in `.env`.
