# Putting the flower shop online with Azure (with an admin page)

After setup, she manages everything at **yoursite.com/admin**:
- add, edit, hide, reorder and delete products
- upload photos straight from her phone (they're resized automatically)
- change the brand name, WhatsApp number, Instagram and email

No code is needed after this one-time setup (about 20 minutes).

## What's in the folder

```
public/                     ← the website
  index.html                ← public shop page
  login.html                ← admin sign-in page
  admin/index.html          ← the admin page
  staticwebapp.config.json  ← locks /admin to invited admins only
api/                        ← small backend that saves products and photos
DEPLOY-TO-AZURE.md          ← this guide
```

## What it costs
- **Static Web App (Free plan):** free, including the backend and sign-in.
- **Storage account:** usually a few fils to a couple of dirhams a month for a small shop's products and photos.

---

## Step 1 — Create a Storage account (where products and photos are saved)
1. In the Azure Portal, go to **Create a resource**, choose **Storage account**, then **Create**.
2. Use the same **resource group** you'll use for the site (e.g. `rg-fuzzy-petals`). Give it a **name** in lowercase letters and numbers only (e.g. `fuzzypetalsstore`). Pick region **UAE North**, set **Performance** to Standard and **Redundancy** to LRS (the cheapest).
3. Click **Review + create**, then **Create**.
4. When it's ready, open it and go to **Security + networking → Access keys**. Click **Show** next to **Connection string** under key1, and **copy** it.

You don't need to create any tables or containers. The site creates them the first time it runs.

## Step 2 — Put the files on GitHub
1. Create a new repository on GitHub (e.g. `fuzzy-petals-site`).
2. Upload the **`public`** and **`api`** folders, keeping the folder structure.

## Step 3 — Create the Static Web App
1. In the Azure Portal, go to **Create a resource**, choose **Static Web App**, then **Create**.
2. Fill in:
   - **Plan type:** Free
   - **Deployment source:** GitHub → your repo → `main` branch
   - **Build presets:** Custom
   - **App location:** `public`
   - **Api location:** `api`
   - **Output location:** leave blank
3. **Review + create**, then **Create**. The first deploy takes a few minutes. You can watch it under **Actions** in GitHub.

## Step 4 — Connect the site to storage
1. Open the Static Web App and go to **Settings → Environment variables**.
2. Click **+ Add**:
   - **Name:** `STORAGE_CONNECTION_STRING`
   - **Value:** the connection string you copied in Step 1
3. Click **Apply**, then **Apply** again to confirm.

## Step 5 — Give her admin access
1. In the Static Web App, go to **Settings → Role management → Invite**.
2. Fill in:
   - **Authorization provider:** Microsoft (works with Outlook, Hotmail or any Microsoft account) or GitHub
   - **Invitee details:** her email address (for Microsoft) or her GitHub username
   - **Domain:** your site's address
   - **Role:** `admin`, which must be spelled exactly like this
   - **Expiration:** e.g. 168 hours
3. Click **Generate** and send her the **invite link**. She opens it, signs in once, and she's an admin.

Do the same for yourself so you can help her. The Free plan allows up to 25 invited people.

## Step 6 — First use
1. Go to `https://<your-site>/admin`. Anyone who isn't signed in is sent to the sign-in page, and anyone who wasn't invited can't get in.
2. Open **Business details** and enter the brand name and WhatsApp number (e.g. `971501234567`).
3. Open **Products**. Tap **Add example products** to start from samples, or **+ Add product** to add her own. Then tap **Edit** on each product to add a photo.

Changes show on the website straight away.

## Adding her own domain (optional)
In the Static Web App, go to **Custom domains → Add** and follow the prompts to add a CNAME or TXT record at your domain registrar. The SSL certificate is free and set up automatically.

---

## If something doesn't work

| Problem | Fix |
|---|---|
| The admin page says *"STORAGE_CONNECTION_STRING is not set"* | Redo Step 4, then wait a minute. |
| After signing in: *"that account doesn't have admin access"* | She signed in with a different account from the one invited, or the role wasn't spelled `admin`. Send a new invite. |
| The website still shows the old sample products | Nothing has been saved in the admin page yet. It shows the built-in samples until products are added there. |
| A photo won't upload | Try a JPG or PNG. iPhone photos normally convert automatically. |
