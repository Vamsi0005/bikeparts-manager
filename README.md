# BikeParts Manager

Mobile-first spare-parts inventory starter built with React, Tailwind CSS v4, Node.js, Express, MongoDB, and Mongoose.

## Features in this starter
- Search products by part name, SKU/product code, manufacturer part number, bike brand, or bike model.
- Store multiple verified compatible bike models against one distinct product.
- Show current stock and rack/shelf/box location.
- Create products from the mobile-friendly interface.
- Low-stock and out-of-stock indicators.
- REST API with basic validation and duplicate SKU handling.

> Sample compatibility data is illustrative only. Verify compatibility with a trusted parts catalogue before using it for customer recommendations.

## Requirements
- Node.js 20+ (Node 22 recommended)
- A MongoDB local instance or MongoDB Atlas database

## 1. Configure the backend
```bash
cd server
npm install
```
Copy `.env.example` to `.env` and set `MONGODB_URI`.

```bash
npm run dev
```
The API runs at `http://localhost:5000`. Health check: `http://localhost:5000/api/health`.

## 2. Configure the frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL shown in your terminal (normally `http://localhost:5173`).

## 3. Optional sample products
Once the backend is running, click **Load demo products** in the app. This creates a few clearly labelled example products only if their product codes do not already exist. Review or delete these examples before entering real stock.

## API routes
- `GET /api/health` — health check
- `GET /api/products?q=...&status=...` — search/filter products
- `GET /api/products/:id` — get a product
- `POST /api/products` — create a product
- `PATCH /api/products/:id` — update product fields
- `PATCH /api/products/:id/stock` — adjust stock by a signed quantity (reason required)

## Product data design
Each distinct physical product/SKU is stored once. `compatibleBikes` contains the verified bike models that product fits. Stock belongs to the product, not to each compatible bike. `locations` supports a product stored in more than one rack/shelf/box.

## Important before real shop use
This is a starter, not yet a production-ready billing system. Add authentication/authorization, audit logs, tested sale/purchase flows with safe stock updates, backups, and deployment configuration before exposing it to the internet or relying on it for business operations. Never commit `.env` or share database credentials.
