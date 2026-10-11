# Putting Yummiii online

This guide puts the shop on a server with its own address and free HTTPS.
You'll need about an hour the first time. Every update after that is one command.

**What you need**

- A **VPS** (a small rented Linux server): 2 GB RAM, Ubuntu 24.04. Pick a **Singapore**
  or **Mumbai** location for speed in Sri Lanka. About US$6–12 a month.
- A **domain name**, e.g. `yummiii.lk` (from the LK Domain Registry or a reseller) or
  `yummiii.com`.

---

## 1. Point your domain at the server

In your domain's DNS settings, add an **A record**:

| Type | Name | Value |
|------|------|-------|
| A | `@` | your server's IP address |
| A | `www` | your server's IP address (optional) |

It can take from a few minutes to a few hours to start working.

## 2. Install Docker on the server

Log in to the server (`ssh root@YOUR_SERVER_IP`), then:

```bash
curl -fsSL https://get.docker.com | sh
```

## 3. Copy the project to the server

From **your computer**, in the folder that contains `Yummi-main`:

```bash
rsync -av --exclude node_modules --exclude vendor --exclude backups \
  --exclude 'backend/.env' Yummi-main/ root@YOUR_SERVER_IP:/opt/yummiii/
```

(If the project is on GitHub, `git clone` on the server works too.)

## 4. Fill in the settings

On the **server**:

```bash
cd /opt/yummiii
cp .env.prod.example .env.prod
echo "base64:$(openssl rand -base64 32)"   # copy into APP_KEY
openssl rand -hex 24                       # copy into DB_PASSWORD
openssl rand -hex 24                       # copy into DB_ROOT_PASSWORD
nano .env.prod                             # fill in every value, then Ctrl+O, Enter, Ctrl+X
```

## 5. Start the shop

```bash
./deploy.sh
```

The very first start takes a few minutes (MySQL sets itself up).

Then, **only the first time**:

```bash
DC="docker compose --env-file .env.prod -f compose.prod.yaml"
$DC exec app php artisan db:seed --force                # delivery areas + categories
$DC exec app php artisan yummiii:admin you@example.com  # your admin account (asks for a password)
```

Open `https://your-domain` 🎉 The HTTPS padlock appears by itself within a minute.
Log in at `https://your-domain/admin/login`, then add your products and photos.

## 6. Nightly backups

```bash
crontab -e
```

Add this line (backs up every night at 2:30 am, keeps 14 days in `/opt/yummiii/backups`):

```
30 2 * * * /opt/yummiii/backup.sh >> /opt/yummiii/backups/backup.log 2>&1
```

Now and then, copy the `backups` folder to your own computer too.

---

## Updating the shop later

Copy the new code to the server (step 3 again), then on the server:

```bash
cd /opt/yummiii && ./deploy.sh
```

Products, orders, photos and the HTTPS certificate are kept.

## Handy commands (on the server, in /opt/yummiii)

| To… | Run |
|-----|-----|
| See if it's running | `docker compose --env-file .env.prod -f compose.prod.yaml ps` |
| See errors | `docker compose --env-file .env.prod -f compose.prod.yaml logs -f app` |
| Reset an admin password | `docker compose --env-file .env.prod -f compose.prod.yaml exec app php artisan yummiii:admin you@example.com` |
| Restart | `docker compose --env-file .env.prod -f compose.prod.yaml restart` |

## Restoring a backup

```bash
DC="docker compose --env-file .env.prod -f compose.prod.yaml"
gunzip -c backups/db-2026-10-11-0230.sql.gz | \
  $DC exec -T -e MYSQL_PWD="$(grep '^DB_PASSWORD=' .env.prod | cut -d= -f2-)" mysql mysql -uyummiii yummiii
$DC exec -T app tar -xzf - -C /app/storage/app < backups/photos-2026-10-11-0230.tar.gz
```
