# 📦 Order Tracker

A modern, responsive, and easy-to-use web application built with pure **HTML, CSS, and JavaScript** to manage and track all your online shopping orders in one place.

---

## ✨ Features

1. **Dashboard & Summary Metrics**
   - **Total Orders**: Complete count of all tracked purchases.
   - **Pending Orders**: Orders awaiting arrival.
   - **On The Way / Dispatched**: Parcels currently in transit.
   - **Delivered / Received**: Successfully received orders.
   - **Total Value (₹)** & **Pending Amount (₹)**: Financial summary calculated automatically.
   - **Upcoming Delivery Alert**: Highlights the soonest approaching parcel and countdown.

2. **Order Management (CRUD)**
   - **Add New Orders**: Enter product name, shopping platform (Meesho, Amazon, Flipkart, etc.), order number, price, quantity, payment method (COD, Online/UPI), ordered date, expected delivery date, status, notes, and product images.
   - **Edit Existing Orders**: Modify any record, including missing prices or order numbers.
   - **Delete Orders**: Safely delete orders with confirmation.
   - **Real-Time Search**: Instant filtering by product name, order number, or notes.
   - **Multi-Filter & Sort**: Filter by delivery status, platform, or sort by delivery date (soonest first) and price.
   - **Table & Grid Views**: Toggle between compact table view and visual card grid view.

3. **Delivery Tracking ("Mark as Received")**
   - Interactive checkbox on every order.
   - Ticking **"Mark Received"** immediately marks status as **Delivered**, sets today's date as the actual delivery date, and displays a green checkmark `✓`.
   - Unticking reverts the status so mistakes can be quickly corrected.
   - All changes save automatically in your browser (`localStorage`) and stay saved after closing and reopening the page.

4. **100% Client-Side Exports (No Server Required)**
   - 📊 **Excel (.xlsx)**: Generates a spreadsheet with an **Orders** sheet and a **Summary** worksheet containing total counts and total order value.
   - 📄 **CSV (.csv)**: Downloads standard CSV formatted with UTF-8 BOM.
   - 📝 **Markdown (.md)**: Formatted table with summary KPIs and order statuses.
   - 💾 **Backup & Restore (JSON)**: One-click backup of all order data, with restore capability.
   - 📥 **Import from CSV**: Imports orders with duplicate validation (checks order numbers and item details to prevent duplicate entries).

5. **Preloaded Sample Orders**
   - Preloaded with the 5 orders:
     1. **48 Marker Pen** — Meesho, Order #`340886586005635776`, 11 Oct 2026, Expected 18 Oct 2026, ₹260, COD, Status: *Packed*.
     2. **Nutrition Jar Product** — Meesho, Expected 15 Oct 2026, ₹309, COD, Status: *Order Placed*.
     3. **TV Stand** — Meesho, Expected 20 Oct 2026, ₹298, COD, Status: *Order Placed*.
     4. **Double Head Coloured Pen Set with 12 Colours** — Meesho, Order #`339665923259753152`, 8 Oct 2026, Expected 17 Oct 2026, ₹143, COD, Status: *On the Way*.
     5. **Brown Food Container Set** — Meesho, Expected 19 Oct 2026, price not yet entered, COD, Status: *On the Way*.

---

## 📁 Project Structure

```text
order-tracker/
├── index.html          # Main dashboard
├── css/
│   └── style.css       # Clean, modern styling & responsive design
├── js/
│   └── script.js      # Pure client-side order management & exports
├── data/
│   └── orders.json     # Initial seed & permanent JSON records
├── images/
│   └── products/       # Product images (marker pens, nutrition jar, etc.)
│       ├── marker_pens.jpg
│       ├── nutrition_jar.jpg
│       ├── tv_stand.jpg
│       ├── colored_pens.jpg
│       └── food_container.jpg
├── exports/
│   ├── orders.xlsx     # Generated Excel report
│   ├── orders.csv      # Generated CSV report
│   └── orders.md       # Generated Markdown report
├── scripts/
│   └── export.py       # Standalone Python export utility (optional)
├── requirements.txt    # Optional Python dependencies
└── README.md           # Documentation
```

---

## 🚀 How to Run & View Output in VS Code

You **do not need Python or any terminal command** to run the app. It runs purely using **HTML, CSS, and JavaScript**.

You already have the necessary extensions installed in VS Code! Choose any of the following easy methods:

### Method 1: Using "Live Server" (Recommended)
1. In the VS Code file explorer, **right-click** on `index.html`.
2. Click **"Open with Live Server"** (or click the **"Go Live"** button in the bottom blue status bar of VS Code).
3. Your default browser (Chrome, Edge, etc.) will automatically open `http://127.0.0.1:5500/index.html`.

### Method 2: Using "Live Preview" (Inside VS Code)
1. **Right-click** on `index.html`.
2. Click **"Show Preview"**.
3. A browser preview tab will open directly inside VS Code next to your code!

### Method 3: Direct Browser Open (No Extension Needed)
1. Open File Explorer on Windows.
2. Navigate to `D:\My_space\order-tracker`.
3. **Double-click** `index.html` to open it in Chrome, Edge, or Firefox.

---

## 📋 How to Use

- **Mark as Received**: Click the checkbox next to any order. It immediately marks the parcel as *Delivered*, shows a green checkmark, records the actual delivery date, and recalculates your pending COD balance.
- **Add an Order**: Click **"＋ Add New Order"** in the top right. Fill in the details, choose a sample product picture or enter a path, and click **Save Order**.
- **Edit an Order**: Click the ✏️ pencil icon to edit prices (such as entering the price for the Food Container Set), dates, or notes.
- **Delete an Order**: Click the 🗑️ trash icon and confirm deletion.
- **Export Reports**: Scroll down to the **Export & Backup** section:
  - Click **Export Excel (.xlsx)** for an Excel sheet with dynamic summaries.
  - Click **Export CSV (.csv)** or **Export Markdown (.md)** for text reports.
  - Click **Backup Records (JSON)** to download a backup file of all your orders.
- **Import from CSV**: Click **Import from CSV**, select any `.csv` order list, and the system will validate headers and automatically skip duplicates.
