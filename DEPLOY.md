# Putting Yummiii online

There are two ways to run it:

- **[Option A: the shop + the portfolio demo on one free server](#option-a-shop--portfolio-demo-on-one-free-server)**
  (recommended for us: free, two addresses, the demo resets every night)
- **[Option B: just one site](#option-b-just-one-site)** on any server with its own domain

---

# Option A: shop + portfolio demo on one free server

```
yummiii.duckdns.org      ─┐                     ┌─▶ 🛍️ real shop   (own database)
                          ├─▶ front door (HTTPS) ┤
yummiii-demo.duckdns.org ─┘                     └─▶ 🎓 demo        (own database, resets nightly)
```

## A1. Get a free server (Oracle Cloud "Always Free")

1. Sign up at **https://www.oracle.com/cloud/free/**. A card is needed for verification
   only; "Always Free" resources are not charged. Pick a home region close to Sri Lanka
   (e.g. **Mumbai, Hyderabad or Singapore**). You can't change it later.
2. **Create a VM instance**:
   - Image: **Canonical Ubuntu 24.04**
   - Shape: **Ampere (VM.Standard.A1.Flex)**, **2 OCPUs, 12 GB memory** (inside the free allowance)
   - **Add SSH keys** → paste your `~/.ssh/id_ed25519.pub`
3. Note its **public IP address**.
4. Open the web ports: **Networking → Virtual cloud networks → your VCN → Security Lists →
   Default → Add Ingress Rules**: source `0.0.0.0/0`, TCP, destination ports **80,443**.
5. Ubuntu on Oracle also blocks them inside the server. After logging in (step A3), run:

   ```bash
   sudo iptables -I INPUT 6 -p tcp -m multiport --dports 80,443 -j ACCEPT
   sudo netfilter-persistent save
   ```

If Oracle shows "out of capacity", try again later or pick another availability domain.

## A2. Get two free addresses (DuckDNS)

1. Sign in at **https://www.duckdns.org** (with GitHub or Google).
2. Add two subdomains, e.g. `yummiii` and `yummiii-demo`, and set **both** to your server's IP.

## A3. Install Docker and copy the project

```bash
ssh ubuntu@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit       # log out and in again so "docker" works without sudo
ssh ubuntu@YOUR_SERVER_IP
git clone https://github.com/mohamadayoobzawahir-png/yummiii.git   # (private repo: use a token or an SSH key)
cd yummiii
```

## A4. Fill in the settings (three files)

```bash
cp .env.proxy.example .env.proxy     # the two addresses + your email
cp .env.prod.example  .env.shop      # the real shop
cp .env.prod.example  .env.demo      # the demo
nano .env.proxy
```

For **each** of `.env.shop` and `.env.demo`: set `APP_URL` to that site's address with
`https://`, create a **different** `APP_KEY`, `DB_PASSWORD` and `DB_ROOT_PASSWORD` for each
(commands are in the file), and add **`DEMO_MODE=true` to `.env.demo` only**.
`SERVER_NAME` and `ACME_EMAIL` can be anything there: the front door handles HTTPS.

## A5. Start everything

```bash
./proxy.sh            # the front door
./deploy.sh shop      # the real shop (first start: a few minutes)
./deploy.sh demo      # the demo
./reset-demo.sh       # fill the demo with sample data
```

First time only, for **the real shop**:

```bash
DC="docker compose -p yummiii-shop --env-file .env.shop -f compose.prod.yaml -f compose.behind-proxy.yaml"
$DC exec app php artisan db:seed --force                  # delivery areas + categories
$DC exec app php artisan yummiii:admin your@email.com     # your sister's / your admin login
```

Open both addresses 🎉 (HTTPS appears within a minute).

## A6. Nightly jobs

`crontab -e`, then add:

```
# 2:30 am: back up the real shop (14 days kept in ~/yummiii/backups/shop)
30 2 * * * /home/ubuntu/yummiii/backup.sh shop >> /home/ubuntu/yummiii/backups/backup.log 2>&1
# 3:00 am: fresh demo data
0 3 * * * /home/ubuntu/yummiii/reset-demo.sh >> /home/ubuntu/yummiii/backups/demo-reset.log 2>&1
```

## A7. Updating later

```bash
cd ~/yummiii && git pull
./deploy.sh shop && ./deploy.sh demo
```

---

# Option B: just one site

This puts the shop on a server with its own address and free HTTPS.
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
