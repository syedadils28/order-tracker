/**
 * Order Tracker - Pure Client-side JavaScript
 * No Python or backend server required.
 * Handles storage via localStorage, full CRUD, filters, search, sorting,
 * delivery checkboxes, CSV import with duplicate validation, and
 * client-side Excel (XLSX), CSV, and Markdown exports.
 */

const STORAGE_KEY = "order_tracker_records_v2";
const THEME_STORAGE_KEY = "order_tracker_theme";

// Preloaded 5 sample orders from user's details
const INITIAL_ORDERS = [
  {
    id: "ORD-101",
    productName: "48 Marker Pen",
    platform: "Meesho",
    orderNo: "340886586005635776",
    orderedDate: "2026-10-11",
    expectedDeliveryDate: "2026-10-18",
    actualDeliveryDate: null,
    price: 260,
    quantity: 1,
    paymentMethod: "Cash on Delivery",
    status: "Packed",
    received: false,
    image: "images/products/marker_pens.jpeg",
    notes: "Packed, ships 12 Oct"
  },
  {
    id: "ORD-102",
    productName: "Nutrition Jar Product",
    platform: "Meesho",
    orderNo: "",
    orderedDate: "2026-10-11",
    expectedDeliveryDate: "2026-10-15",
    actualDeliveryDate: null,
    price: 309,
    quantity: 1,
    paymentMethod: "Cash on Delivery",
    status: "Order Placed",
    received: false,
    image: "images/products/nutrition_jar.jpeg",
    notes: "Pay online to save COD fee"
  },
  {
    id: "ORD-103",
    productName: "TV Stand",
    platform: "Meesho",
    orderNo: "",
    orderedDate: "2026-10-11",
    expectedDeliveryDate: "2026-10-20",
    actualDeliveryDate: null,
    price: 298,
    quantity: 1,
    paymentMethod: "Cash on Delivery",
    status: "Order Placed",
    received: false,
    image: "images/products/laptop_stand.jpeg",
    notes: "Monitor / Desk Stand"
  },
  {
    id: "ORD-104",
    productName: "Double Head Coloured Pen Set with 12 Colours",
    platform: "Meesho",
    orderNo: "339665923259753152",
    orderedDate: "2026-10-08",
    expectedDeliveryDate: "2026-10-17",
    actualDeliveryDate: null,
    price: 143,
    quantity: 1,
    paymentMethod: "Cash on Delivery",
    status: "On the Way",
    received: false,
    image: "images/products/colored_pens.jpeg",
    notes: "At New Delhi West hub"
  },
  {
    id: "ORD-105",
    productName: "Brown Food Container Set",
    platform: "Meesho",
    orderNo: "",
    orderedDate: "2026-10-11",
    expectedDeliveryDate: "2026-10-19",
    actualDeliveryDate: null,
    price: null, // Price not yet entered as requested
    quantity: 1,
    paymentMethod: "Cash on Delivery",
    status: "On the Way",
    received: false,
    image: "images/products/food_container.jpeg",
    notes: "Price not entered yet"
  }
];

// Preset image choices for easy selection
const PRESET_IMAGES = [
  { name: "Marker Pens", url: "images/products/marker_pens.jpeg" },
  { name: "Nutrition Jar", url: "images/products/nutrition_jar.jpeg" },
  { name: "Laptop Stand", url: "images/products/laptop_stand.jpeg" },
  { name: "Colored Pens", url: "images/products/colored_pens.jpeg" },
  { name: "Food Containers", url: "images/products/food_container.jpeg" }
];

// Helper to normalize image paths (handles renames from .jpg to .jpeg and tv_stand to laptop_stand)
function normalizeImagePath(path) {
  if (!path || typeof path !== "string") return path;
  let normalized = path;
  // Migrate tv_stand to laptop_stand
  normalized = normalized.replace(/tv_stand\.(jpg|jpeg|png|webp)/gi, "laptop_stand.jpeg");
  // Migrate any old .jpg extensions in images/products/ to .jpeg
  normalized = normalized.replace(/images\/products\/(marker_pens|nutrition_jar|colored_pens|food_container|laptop_stand)\.jpg/gi, "images/products/$1.jpeg");
  return normalized;
}

// App State
let orders = [];
let currentActiveView = "dashboard";
let currentSearch = "";
let currentStatusFilter = "all";
let currentPlatformFilter = "all";
let currentSortBy = "expected-asc";
let currentViewMode = "table"; // 'table' or 'grid'
let editingOrderId = null;
let orderToDeleteId = null;

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadOrders();
  setupEventListeners();
  renderApp();
});

// Load orders from LocalStorage or seed defaults
function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let hasMigrated = false;
        orders = parsed.map(order => {
          const updatedImage = normalizeImagePath(order.image);
          if (updatedImage !== order.image) {
            hasMigrated = true;
            return { ...order, image: updatedImage };
          }
          return order;
        });
        if (hasMigrated) {
          saveOrders();
        }
        return;
      }
    }
  } catch (err) {
    console.error("Could not load from localStorage:", err);
  }
  // Fallback to initial seed
  orders = JSON.parse(JSON.stringify(INITIAL_ORDERS));
  saveOrders();
}

// Save orders to LocalStorage
function saveOrders() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
    showToast("Warning: Could not save records to browser storage", "error");
  }
}

// Theme Management (Default: Dark Theme)
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  const label = document.getElementById("themeToggleLabel");
  const icon = document.getElementById("themeToggleIcon");
  if (label && icon) {
    if (theme === "dark") {
      label.textContent = "Dark";
      icon.textContent = "🌙";
    } else {
      label.textContent = "Light";
      icon.textContent = "☀️";
    }
  }
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") || "dark";
  const newTheme = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  applyTheme(newTheme);
  showToast(`Switched to ${newTheme === "dark" ? "Dark" : "Light"} Mode`, "info");
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme Toggle Button
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // Mobile sidebar toggle
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // Sidebar navigation links
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-nav");
      if (target) {
        navigateTo(target);
      }
      if (sidebar) sidebar.classList.remove("mobile-open");
    });
  });

  // Search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderOrdersList();
    });
  }

  // Filter dropdowns
  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentStatusFilter = e.target.value;
      renderOrdersList();
    });
  }

  const platformFilter = document.getElementById("platformFilter");
  if (platformFilter) {
    platformFilter.addEventListener("change", (e) => {
      currentPlatformFilter = e.target.value;
      renderOrdersList();
    });
  }

  const sortBy = document.getElementById("sortBy");
  if (sortBy) {
    sortBy.addEventListener("change", (e) => {
      currentSortBy = e.target.value;
      renderOrdersList();
    });
  }

  // View toggle buttons (table vs grid)
  const viewTableBtn = document.getElementById("viewTableBtn");
  const viewGridBtn = document.getElementById("viewGridBtn");
  if (viewTableBtn && viewGridBtn) {
    viewTableBtn.addEventListener("click", () => {
      currentViewMode = "table";
      viewTableBtn.classList.add("active");
      viewGridBtn.classList.remove("active");
      renderOrdersList();
    });
    viewGridBtn.addEventListener("click", () => {
      currentViewMode = "grid";
      viewGridBtn.classList.add("active");
      viewTableBtn.classList.remove("active");
      renderOrdersList();
    });
  }

  // Add order buttons
  const addOrderBtn = document.getElementById("addOrderBtn");
  if (addOrderBtn) {
    addOrderBtn.addEventListener("click", () => openOrderModal());
  }

  // Modal Cancel & Close buttons
  const closeOrderModal = document.getElementById("closeOrderModal");
  const cancelOrderModal = document.getElementById("cancelOrderModal");
  if (closeOrderModal) closeOrderModal.addEventListener("click", closeOrderModalHandler);
  if (cancelOrderModal) cancelOrderModal.addEventListener("click", closeOrderModalHandler);

  // Image Upload, Change, & Remove controls
  const uploadImageBtn = document.getElementById("uploadImageBtn");
  const modalImageFileInput = document.getElementById("modalImageFileInput");
  const removeImageBtn = document.getElementById("removeImageBtn");
  const modalImageUrl = document.getElementById("modalImageUrl");

  if (uploadImageBtn && modalImageFileInput) {
    uploadImageBtn.addEventListener("click", () => modalImageFileInput.click());
    modalImageFileInput.addEventListener("change", handleImageFileUpload);
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener("click", () => {
      if (modalImageUrl) modalImageUrl.value = "";
      if (modalImageFileInput) modalImageFileInput.value = "";
      updateImagePreview("");
      showToast("Photo removed", "info");
    });
  }

  if (modalImageUrl) {
    modalImageUrl.addEventListener("input", (e) => {
      updateImagePreview(e.target.value.trim());
    });
  }

  // Order Form Submit
  const orderForm = document.getElementById("orderForm");
  if (orderForm) {
    orderForm.addEventListener("submit", handleOrderFormSubmit);
  }

  // Delete Confirmation Modal
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      document.getElementById("deleteModal").classList.remove("open");
      orderToDeleteId = null;
    });
  }
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (orderToDeleteId) {
        deleteOrder(orderToDeleteId);
        document.getElementById("deleteModal").classList.remove("open");
        orderToDeleteId = null;
      }
    });
  }

  // Export buttons
  const exportXlsxBtn = document.getElementById("exportXlsxBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const exportMdBtn = document.getElementById("exportMdBtn");
  const backupJsonBtn = document.getElementById("backupJsonBtn");
  const restoreJsonBtn = document.getElementById("restoreJsonBtn");
  const jsonFileInput = document.getElementById("jsonFileInput");
  const importCsvBtn = document.getElementById("importCsvBtn");
  const csvFileInput = document.getElementById("csvFileInput");

  if (exportXlsxBtn) exportXlsxBtn.addEventListener("click", exportToExcel);
  if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportToCSV);
  if (exportMdBtn) exportMdBtn.addEventListener("click", exportToMarkdown);
  if (backupJsonBtn) backupJsonBtn.addEventListener("click", backupToJSON);

  if (restoreJsonBtn && jsonFileInput) {
    restoreJsonBtn.addEventListener("click", () => jsonFileInput.click());
    jsonFileInput.addEventListener("change", handleRestoreJSON);
  }

  if (importCsvBtn && csvFileInput) {
    importCsvBtn.addEventListener("click", () => csvFileInput.click());
    csvFileInput.addEventListener("change", handleImportCSV);
  }
}

// View Navigation Handler (Separates Dashboard, Orders, & Exports)
function navigateTo(navTarget) {
  currentActiveView = navTarget;

  // Update sidebar active buttons
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("data-nav") === navTarget);
  });

  const viewDashboard = document.getElementById("view-dashboard");
  const viewOrders = document.getElementById("view-orders");
  const viewExports = document.getElementById("view-exports");
  const headerTitle = document.querySelector(".header-title-group h2");
  const headerSubtitle = document.querySelector(".header-title-group p");

  if (viewDashboard) viewDashboard.style.display = "none";
  if (viewOrders) viewOrders.style.display = "none";
  if (viewExports) viewExports.style.display = "none";

  if (navTarget === "dashboard") {
    if (viewDashboard) viewDashboard.style.display = "flex";
    if (headerTitle) headerTitle.textContent = "Order Tracking Dashboard";
    if (headerSubtitle) headerSubtitle.textContent = "Overview of online shopping orders and fulfillment progress";
    renderDashboard();
  } else if (navTarget === "orders") {
    if (viewOrders) viewOrders.style.display = "flex";
    currentStatusFilter = "all";
    if (document.getElementById("statusFilter")) document.getElementById("statusFilter").value = "all";
    if (headerTitle) headerTitle.textContent = "All Orders";
    if (headerSubtitle) headerSubtitle.textContent = "Browse, search, edit, and mark your orders as received";
    renderOrdersList();
  } else if (navTarget === "ontheway") {
    if (viewOrders) viewOrders.style.display = "flex";
    currentStatusFilter = "On the Way";
    if (document.getElementById("statusFilter")) document.getElementById("statusFilter").value = "On the Way";
    if (headerTitle) headerTitle.textContent = "Orders On The Way (In Transit)";
    if (headerSubtitle) headerSubtitle.textContent = "Tracking parcels currently dispatched and in transit";
    renderOrdersList();
  } else if (navTarget === "delivered") {
    if (viewOrders) viewOrders.style.display = "flex";
    currentStatusFilter = "Delivered";
    if (document.getElementById("statusFilter")) document.getElementById("statusFilter").value = "Delivered";
    if (headerTitle) headerTitle.textContent = "Delivered / Received Orders";
    if (headerSubtitle) headerSubtitle.textContent = "History of completed deliveries and actual delivery dates";
    renderOrdersList();
  } else if (navTarget === "exports") {
    if (viewExports) viewExports.style.display = "flex";
    if (headerTitle) headerTitle.textContent = "Export Records & Data Tools";
    if (headerSubtitle) headerSubtitle.textContent = "Download Excel, CSV, Markdown reports, or backup database";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Render Dashboard View
function renderDashboard() {
  renderSummaryCards();
  renderUpcomingAlert();
  renderDashboardInsights();
  renderPlatformBreakdown();
}

// Render Platform Breakdown (Meesho, Flipkart, Amazon, etc.)
function renderPlatformBreakdown() {
  const container = document.getElementById("platformDistributionList");
  const totalBadge = document.getElementById("platformTotalBadge");
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:16px 0;color:var(--text-muted);font-size:12px;">
        No orders recorded yet.
      </div>
    `;
    if (totalBadge) totalBadge.textContent = "0 Platforms";
    return;
  }

  // Aggregate orders by platform
  const stats = {};
  let totalProducts = 0;

  orders.forEach(o => {
    const plat = (o.platform || "Other").trim();
    if (!stats[plat]) {
      stats[plat] = { count: 0, totalAmount: 0 };
    }
    const qty = Number(o.quantity) || 1;
    const price = o.price !== null && o.price !== undefined ? Number(o.price) : 0;
    stats[plat].count += qty;
    stats[plat].totalAmount += price * qty;
    totalProducts += qty;
  });

  const platformKeys = Object.keys(stats).sort((a, b) => stats[b].count - stats[a].count);
  if (totalBadge) {
    totalBadge.textContent = `${platformKeys.length} Platforms • ${totalProducts} Items`;
  }

  // Brand colors for platform bars
  const platformColors = {
    "meesho": "#ec4899",
    "flipkart": "#3b82f6",
    "amazon": "#f59e0b",
    "myntra": "#f43f5e",
    "ajio": "#10b981",
    "blinkit": "#eab308",
    "zepto": "#8b5cf6",
    "other": "#64748b"
  };

  container.innerHTML = platformKeys.map(plat => {
    const data = stats[plat];
    const pct = totalProducts > 0 ? Math.round((data.count / totalProducts) * 100) : 0;
    const colorKey = plat.toLowerCase();
    const barColor = platformColors[colorKey] || "#0d9488";
    const badgeHtml = getPlatformBadgeHtml(plat);

    return `
      <div class="platform-stat-row" onclick="filterByPlatformAndNavigate('${escapeHtml(plat)}')" title="Click to view all ${escapeHtml(plat)} orders">
        <div class="platform-stat-top">
          <div class="platform-stat-left">
            ${badgeHtml}
            <span class="platform-count-badge"><strong>${data.count}</strong> ${data.count === 1 ? 'item' : 'items'} (${pct}%)</span>
          </div>
          <div class="platform-amount-badge">${formatCurrency(data.totalAmount)}</div>
        </div>
        <div class="platform-mini-bar">
          <div class="platform-mini-fill" style="width: ${pct}%; background: ${barColor};"></div>
        </div>
      </div>
    `;
  }).join("");
}

function filterByPlatformAndNavigate(platformName) {
  navigateTo("orders");
  currentPlatformFilter = platformName;
  const platformSelect = document.getElementById("platformFilter");
  if (platformSelect) {
    platformSelect.value = platformName;
  }
  renderOrdersList();
  showToast(`Filtered orders by ${platformName}`, "info");
}

// Render Dashboard In-Transit Quick Preview & Progress Bar
function renderDashboardInsights() {
  const container = document.getElementById("dashboardQuickOrdersList");
  const progressBar = document.getElementById("fulfillmentProgressBar");
  const percentageEl = document.getElementById("fulfillmentPercentage");
  const deliveredCountEl = document.getElementById("fulfillmentDeliveredCount");
  const totalCountEl = document.getElementById("fulfillmentTotalCount");

  // Calculate fulfillment stats
  const totalOrders = orders.length;
  const deliveredCount = orders.filter(o => o.received || o.status === "Delivered" || o.status === "Delivered / Received").length;
  const percent = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  if (progressBar) progressBar.style.width = percent + "%";
  if (percentageEl) percentageEl.textContent = percent + "%";
  if (deliveredCountEl) deliveredCountEl.textContent = `${deliveredCount} Delivered`;
  if (totalCountEl) totalCountEl.textContent = `${totalOrders} Total Orders`;

  if (!container) return;

  // Active unreceived orders (earliest expected delivery first)
  const activeOrders = orders
    .filter(o => !o.received && o.status !== "Cancelled" && o.status !== "Returned")
    .sort((a, b) => (a.expectedDeliveryDate || "9999").localeCompare(b.expectedDeliveryDate || "9999"))
    .slice(0, 4);

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px 10px;color:var(--text-muted);">
        <div style="font-size:32px;margin-bottom:6px;">🎉</div>
        <p style="font-size:13px;font-weight:600;color:var(--text-main);">All caught up!</p>
        <p style="font-size:12px;">No active parcels awaiting delivery right now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeOrders.map(o => {
    const thumbHtml = o.image
      ? `<img src="${escapeHtml(o.image)}" class="quick-order-thumb" alt="${escapeHtml(o.productName)}" onerror="this.outerHTML='<div class=\\'quick-order-thumb\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--bg-card)\\'>📦</div>'"/>`
      : `<div class="quick-order-thumb" style="display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--bg-card)">📦</div>`;

    return `
      <div class="dashboard-quick-order-item">
        <div class="quick-order-left">
          ${thumbHtml}
          <div class="quick-order-info">
            <span class="quick-order-name">${escapeHtml(o.productName)}</span>
            <div class="quick-order-sub">
              <span>${escapeHtml(o.platform || "Meesho")}</span>
              <span>•</span>
              <span>Expected: <strong>${formatDate(o.expectedDeliveryDate)}</strong></span>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${getStatusBadgeHtml(o.status, false)}
          <button type="button" class="btn btn-secondary btn-sm" onclick="handleToggleReceive('${o.id}', true)" title="Quick Mark as Received">
            ✓ Receive
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// Render All Components
function renderApp() {
  renderDashboard();
  renderOrdersList();
}

// Format Currency
function formatCurrency(val) {
  if (val === null || val === undefined || val === "" || isNaN(val)) {
    return "—";
  }
  return "₹" + Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// Format Date cleanly
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

// Format Relative Days
function getDeliveryDaysBadge(expectedDate, isReceived) {
  if (isReceived) {
    return `<span class="upcoming-pill" style="color:#047857;border-color:#a7f3d0;background:#ecfdf5">Delivered</span>`;
  }
  if (!expectedDate) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expectedDate + "T00:00:00");
  if (isNaN(target.getTime())) return "";

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `<span class="upcoming-pill" style="color:#b91c1c;border-color:#fecaca;background:#fef2f2">${Math.abs(diffDays)}d overdue</span>`;
  } else if (diffDays === 0) {
    return `<span class="upcoming-pill" style="color:#c2410c;border-color:#fed7aa;background:#fff7ed">Today</span>`;
  } else if (diffDays === 1) {
    return `<span class="upcoming-pill" style="color:#b45309;border-color:#fde68a;background:#fffbeb">Tomorrow</span>`;
  } else {
    return `<span class="upcoming-pill">In ${diffDays} days</span>`;
  }
}

// 1. Render Summary Cards
function renderSummaryCards() {
  let totalOrders = orders.length;
  let pendingOrders = 0;
  let onTheWayOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let totalOrderValue = 0;
  let pendingOrderValue = 0;

  orders.forEach(o => {
    const price = o.price !== null && o.price !== undefined && o.price !== "" ? Number(o.price) : 0;
    const qty = Number(o.quantity) || 1;
    const itemTotal = price * qty;
    
    totalOrderValue += itemTotal;

    if (o.received || o.status === "Delivered" || o.status === "Delivered / Received") {
      deliveredOrders++;
    } else if (o.status === "Cancelled" || o.status === "Returned") {
      cancelledOrders++;
    } else {
      pendingOrders++;
      pendingOrderValue += itemTotal;
      if (o.status === "On the Way" || o.status === "Out for Delivery") {
        onTheWayOrders++;
      }
    }
  });

  const kpiTotal = document.getElementById("kpiTotal");
  const kpiPending = document.getElementById("kpiPending");
  const kpiOnTheWay = document.getElementById("kpiOnTheWay");
  const kpiDelivered = document.getElementById("kpiDelivered");
  const kpiCancelled = document.getElementById("kpiCancelled");
  const kpiTotalValue = document.getElementById("kpiTotalValue");
  const kpiPendingValue = document.getElementById("kpiPendingValue");

  if (kpiTotal) kpiTotal.textContent = totalOrders;
  if (kpiPending) kpiPending.textContent = pendingOrders;
  if (kpiOnTheWay) kpiOnTheWay.textContent = onTheWayOrders;
  if (kpiDelivered) kpiDelivered.textContent = deliveredOrders;
  if (kpiCancelled) kpiCancelled.textContent = cancelledOrders;
  if (kpiTotalValue) kpiTotalValue.textContent = formatCurrency(totalOrderValue);
  if (kpiPendingValue) kpiPendingValue.textContent = formatCurrency(pendingOrderValue);
}

// 2. Render Upcoming Deliveries Alert Banner
function renderUpcomingAlert() {
  const container = document.getElementById("upcomingAlertContainer");
  if (!container) return;

  // Filter unreceived orders with expected dates, sort by earliest
  const pendingOrders = orders
    .filter(o => !o.received && o.status !== "Cancelled" && o.status !== "Returned" && o.expectedDeliveryDate)
    .sort((a, b) => (a.expectedDeliveryDate || "9999").localeCompare(b.expectedDeliveryDate || "9999"));

  if (pendingOrders.length === 0) {
    container.innerHTML = `
      <div class="upcoming-alert-banner" style="background:#f8fafc;border-color:#e2e8f0">
        <div class="upcoming-left">
          <span class="upcoming-icon">✨</span>
          <div class="upcoming-info">
            <h4 style="color:#0f172a">No Pending Deliveries</h4>
            <p>All active orders have been delivered or none are scheduled.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const nextOrder = pendingOrders[0];
  const pillsHtml = pendingOrders.slice(0, 3).map(o => {
    return `<span class="upcoming-pill"><strong>${escapeHtml(o.productName)}</strong>: ${formatDate(o.expectedDeliveryDate)}</span>`;
  }).join("");

  container.innerHTML = `
    <div class="upcoming-alert-banner">
      <div class="upcoming-left">
        <span class="upcoming-icon">🚚</span>
        <div class="upcoming-info">
          <h4>Next Expected Delivery: ${formatDate(nextOrder.expectedDeliveryDate)}</h4>
          <p><strong>${escapeHtml(nextOrder.productName)}</strong> via ${escapeHtml(nextOrder.platform || "Meesho")} (${nextOrder.status})</p>
        </div>
      </div>
      <div class="upcoming-list-pill">
        ${pillsHtml}
        ${pendingOrders.length > 3 ? `<span class="upcoming-pill">+${pendingOrders.length - 3} more</span>` : ""}
      </div>
    </div>
  `;
}

// 3. Render Orders List (Table & Grid)
function renderOrdersList() {
  const tableContainer = document.getElementById("tableContainer");
  const gridContainer = document.getElementById("gridContainer");
  const tableBody = document.getElementById("ordersTableBody");
  const ordersCountBadge = document.getElementById("ordersCountBadge");

  // Filter orders
  let filtered = orders.filter(o => {
    // Search query
    if (currentSearch) {
      const name = (o.productName || "").toLowerCase();
      const num = (o.orderNo || "").toLowerCase();
      const notes = (o.notes || "").toLowerCase();
      const plat = (o.platform || "").toLowerCase();
      if (!name.includes(currentSearch) && !num.includes(currentSearch) && !notes.includes(currentSearch) && !plat.includes(currentSearch)) {
        return false;
      }
    }

    // Status filter
    if (currentStatusFilter !== "all") {
      if (currentStatusFilter === "Delivered") {
        if (!o.received && o.status !== "Delivered" && o.status !== "Delivered / Received") return false;
      } else if (currentStatusFilter === "Pending") {
        if (o.received || o.status === "Delivered" || o.status === "Cancelled") return false;
      } else if (o.status !== currentStatusFilter) {
        return false;
      }
    }

    // Platform filter
    if (currentPlatformFilter !== "all") {
      if ((o.platform || "Meesho").toLowerCase() !== currentPlatformFilter.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // Sort orders
  filtered.sort((a, b) => {
    if (currentSortBy === "expected-asc") {
      return (a.expectedDeliveryDate || "9999").localeCompare(b.expectedDeliveryDate || "9999");
    } else if (currentSortBy === "expected-desc") {
      return (b.expectedDeliveryDate || "0000").localeCompare(a.expectedDeliveryDate || "0000");
    } else if (currentSortBy === "ordered-desc") {
      return (b.orderedDate || "").localeCompare(a.orderedDate || "");
    } else if (currentSortBy === "price-high") {
      return (Number(b.price) || 0) - (Number(a.price) || 0);
    } else if (currentSortBy === "price-low") {
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    }
    return 0;
  });

  if (ordersCountBadge) {
    ordersCountBadge.textContent = `${filtered.length} of ${orders.length} orders`;
  }

  // Toggle View Containers
  if (currentViewMode === "table") {
    if (tableContainer) tableContainer.style.display = "block";
    if (gridContainer) gridContainer.style.display = "none";
  } else {
    if (tableContainer) tableContainer.style.display = "none";
    if (gridContainer) gridContainer.style.display = "grid";
  }

  // Handle Empty State
  if (filtered.length === 0) {
    const emptyHtml = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No matching orders found</h3>
        <p>Try clearing your search or filters, or click "Add New Order" to record an order.</p>
        <button class="btn btn-primary" onclick="openOrderModal()">＋ Add New Order</button>
      </div>
    `;
    if (tableContainer) {
      tableContainer.innerHTML = emptyHtml;
    }
    if (gridContainer) {
      gridContainer.innerHTML = emptyHtml;
    }
    return;
  }

  // Re-establish table structure if it was replaced by empty state
  if (tableContainer && !tableContainer.querySelector("table")) {
    tableContainer.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th style="width: 48px;">Status</th>
            <th>Product Details</th>
            <th>Platform</th>
            <th>Order No</th>
            <th>Expected By</th>
            <th>Price</th>
            <th>Mark Received</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody id="ordersTableBody"></tbody>
      </table>
    `;
  }

  const tbody = document.getElementById("ordersTableBody");
  if (tbody) {
    tbody.innerHTML = filtered.map(o => createTableRowHtml(o)).join("");
  }

  if (gridContainer) {
    gridContainer.innerHTML = filtered.map(o => createGridCardHtml(o)).join("");
  }
}

// Generate HTML for a Table Row
function createTableRowHtml(o) {
  const isDelivered = o.received || o.status === "Delivered" || o.status === "Delivered / Received";
  const rowClass = isDelivered ? "row-delivered" : "";
  const statusBadge = getStatusBadgeHtml(o.status, isDelivered);
  const platformBadge = getPlatformBadgeHtml(o.platform);
  const daysBadge = getDeliveryDaysBadge(o.expectedDeliveryDate, isDelivered);

  const thumbHtml = o.image
    ? `<img src="${escapeHtml(o.image)}" class="product-thumb" alt="${escapeHtml(o.productName)}" onerror="this.outerHTML='<div class=\\'product-thumb-placeholder\\'>📦</div>'"/>`
    : `<div class="product-thumb-placeholder">📦</div>`;

  const priceFormatted = o.price !== null && o.price !== undefined && o.price !== ""
    ? `<div class="price-cell">${formatCurrency(o.price)}</div>`
    : `<div class="price-empty">Not entered</div>`;

  const orderNoHtml = o.orderNo
    ? `<div class="order-no-cell">
         <span>${escapeHtml(o.orderNo)}</span>
         <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(o.orderNo)}', event)" title="Copy Order Number">📋</button>
       </div>`
    : `<span style="color:var(--text-muted);font-style:italic">—</span>`;

  return `
    <tr class="${rowClass}">
      <td>${statusBadge}</td>
      <td>
        <div class="product-cell">
          ${thumbHtml}
          <div class="product-details">
            <span class="product-name">${escapeHtml(o.productName)}</span>
            <div class="product-subinfo">
              <span>Qty: ${o.quantity || 1}</span>
              <span>•</span>
              <span>${escapeHtml(o.paymentMethod || "COD")}</span>
              ${o.orderedDate ? `<span>• Ordered: ${formatDate(o.orderedDate)}</span>` : ""}
            </div>
            ${o.notes ? `<div class="notes-preview" title="${escapeHtml(o.notes)}">📝 ${escapeHtml(o.notes)}</div>` : ""}
          </div>
        </div>
      </td>
      <td>${platformBadge}</td>
      <td>${orderNoHtml}</td>
      <td>
        <div><strong>${formatDate(o.expectedDeliveryDate)}</strong></div>
        <div>${daysBadge}</div>
        ${o.actualDeliveryDate && isDelivered ? `<div style="font-size:11px;color:#047857">Received on ${formatDate(o.actualDeliveryDate)}</div>` : ""}
      </td>
      <td>${priceFormatted}</td>
      <td>
        <label class="receive-checkbox-label">
          <input type="checkbox" class="receive-checkbox" ${isDelivered ? "checked" : ""} onchange="handleToggleReceive('${o.id}', this.checked)">
          <span>${isDelivered ? '<span class="delivered-check-icon">✓</span> Received' : 'Mark Received'}</span>
        </label>
      </td>
      <td style="text-align: right;">
        <div class="actions-cell" style="justify-content: flex-end;">
          <button class="action-icon-btn" onclick="openOrderModal('${o.id}')" title="Edit Order">✏️</button>
          <button class="action-icon-btn delete" onclick="confirmDeleteOrder('${o.id}')" title="Delete Order">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}

// Generate HTML for a Grid Card
function createGridCardHtml(o) {
  const isDelivered = o.received || o.status === "Delivered";
  const cardClass = isDelivered ? "card-delivered" : "";
  const statusBadge = getStatusBadgeHtml(o.status, isDelivered);
  const platformBadge = getPlatformBadgeHtml(o.platform);
  const daysBadge = getDeliveryDaysBadge(o.expectedDeliveryDate, isDelivered);

  const thumbHtml = o.image
    ? `<img src="${escapeHtml(o.image)}" class="grid-card-thumb" alt="${escapeHtml(o.productName)}" onerror="this.outerHTML='<div class=\\'product-thumb-placeholder\\'>📦</div>'"/>`
    : `<div class="product-thumb-placeholder" style="width:56px;height:56px">📦</div>`;

  return `
    <div class="order-grid-card ${cardClass}">
      <div class="grid-card-top">
        ${thumbHtml}
        <div class="grid-card-info">
          <div class="grid-card-title" title="${escapeHtml(o.productName)}">${escapeHtml(o.productName)}</div>
          <div class="grid-card-platform">${platformBadge}</div>
        </div>
        <div>${statusBadge}</div>
      </div>
      
      <div class="grid-card-details">
        <div class="grid-detail-item">
          <span>Price & Qty</span>
          <strong>${o.price !== null && o.price !== "" ? formatCurrency(o.price) : "Not entered"} (x${o.quantity || 1})</strong>
        </div>
        <div class="grid-detail-item">
          <span>Expected Delivery</span>
          <strong>${formatDate(o.expectedDeliveryDate)}</strong>
        </div>
        <div class="grid-detail-item">
          <span>Order Number</span>
          <strong style="font-family:monospace;font-size:11px">${o.orderNo ? escapeHtml(o.orderNo) : "—"}</strong>
        </div>
        <div class="grid-detail-item">
          <span>Payment</span>
          <strong>${escapeHtml(o.paymentMethod || "COD")}</strong>
        </div>
      </div>

      ${o.notes ? `<div style="font-size:11.5px;color:var(--text-muted);font-style:italic">"${escapeHtml(o.notes)}"</div>` : ""}

      <div class="grid-card-bottom">
        <label class="receive-checkbox-label">
          <input type="checkbox" class="receive-checkbox" ${isDelivered ? "checked" : ""} onchange="handleToggleReceive('${o.id}', this.checked)">
          <span>${isDelivered ? '<span class="delivered-check-icon">✓</span> Received' : 'Mark as Received'}</span>
        </label>
        <div class="actions-cell">
          <button class="action-icon-btn" onclick="openOrderModal('${o.id}')" title="Edit Order">✏️</button>
          <button class="action-icon-btn delete" onclick="confirmDeleteOrder('${o.id}')" title="Delete Order">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

// Helpers for badges
function getStatusBadgeHtml(status, isDelivered) {
  if (isDelivered) {
    return `<span class="status-badge delivered"><span class="status-dot-sm"></span> Delivered</span>`;
  }
  const s = (status || "Order Placed").toLowerCase();
  if (s.includes("placed")) {
    return `<span class="status-badge placed"><span class="status-dot-sm"></span> Order Placed</span>`;
  } else if (s.includes("packed")) {
    return `<span class="status-badge packed"><span class="status-dot-sm"></span> Packed</span>`;
  } else if (s.includes("out")) {
    return `<span class="status-badge out"><span class="status-dot-sm"></span> Out for Delivery</span>`;
  } else if (s.includes("way")) {
    return `<span class="status-badge ontheway"><span class="status-dot-sm"></span> On the Way</span>`;
  } else if (s.includes("cancel")) {
    return `<span class="status-badge cancelled"><span class="status-dot-sm"></span> Cancelled</span>`;
  } else if (s.includes("return")) {
    return `<span class="status-badge returned"><span class="status-dot-sm"></span> Returned</span>`;
  }
  return `<span class="status-badge placed">${escapeHtml(status)}</span>`;
}

function getPlatformBadgeHtml(platform) {
  const p = (platform || "Meesho").toLowerCase();
  if (p.includes("meesho")) {
    return `<span class="platform-badge platform-meesho">Meesho</span>`;
  } else if (p.includes("amazon")) {
    return `<span class="platform-badge platform-amazon">Amazon</span>`;
  } else if (p.includes("flipkart")) {
    return `<span class="platform-badge platform-flipkart">Flipkart</span>`;
  } else if (p.includes("myntra")) {
    return `<span class="platform-badge platform-myntra">Myntra</span>`;
  }
  return `<span class="platform-badge platform-other">${escapeHtml(platform || "Other")}</span>`;
}

// Toggle "Mark as Received"
function handleToggleReceive(orderId, isChecked) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const todayStr = new Date().toISOString().slice(0, 10);
  order.received = isChecked;

  if (isChecked) {
    order.status = "Delivered";
    order.actualDeliveryDate = todayStr;
    showToast(`Order marked as Delivered! (${order.productName})`, "success");
  } else {
    // If unchecked, allow reverting
    order.status = "On the Way";
    order.actualDeliveryDate = null;
    showToast(`Order reverted to On the Way`, "info");
  }

  saveOrders();
  renderApp();
}

// Open Order Modal (Add or Edit)
function openOrderModal(orderId = null) {
  editingOrderId = orderId;
  const modal = document.getElementById("orderModal");
  const modalTitle = document.getElementById("orderModalTitle");
  const form = document.getElementById("orderForm");

  form.reset();
  renderPresetImagesList();

  if (orderId) {
    modalTitle.textContent = "Edit Order Details";
    const o = orders.find(item => item.id === orderId);
    if (o) {
      document.getElementById("modalProductName").value = o.productName || "";
      document.getElementById("modalPlatform").value = o.platform || "Meesho";
      document.getElementById("modalOrderNo").value = o.orderNo || "";
      document.getElementById("modalPrice").value = o.price !== null && o.price !== undefined ? o.price : "";
      document.getElementById("modalQuantity").value = o.quantity || 1;
      document.getElementById("modalPayment").value = o.paymentMethod || "Cash on Delivery";
      document.getElementById("modalOrderedDate").value = o.orderedDate || "";
      document.getElementById("modalExpectedDate").value = o.expectedDeliveryDate || "";
      document.getElementById("modalActualDate").value = o.actualDeliveryDate || "";
      document.getElementById("modalStatus").value = o.status || "Order Placed";
      document.getElementById("modalReceived").checked = Boolean(o.received);
      document.getElementById("modalImageUrl").value = o.image || "";
      document.getElementById("modalNotes").value = o.notes || "";
      updateImagePreview(o.image || "");
    }
  } else {
    modalTitle.textContent = "Add New Order";
    document.getElementById("modalOrderedDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("modalStatus").value = "Order Placed";
    document.getElementById("modalPlatform").value = "Meesho";
    document.getElementById("modalPayment").value = "Cash on Delivery";
    document.getElementById("modalQuantity").value = 1;
    document.getElementById("modalImageUrl").value = "";
    updateImagePreview("");
  }

  modal.classList.add("open");
}

function closeOrderModalHandler() {
  document.getElementById("orderModal").classList.remove("open");
  editingOrderId = null;
}

// Image Preview & Upload Helpers
function updateImagePreview(url) {
  const previewImg = document.getElementById("imagePreviewImg");
  const placeholder = document.getElementById("imagePreviewPlaceholder");
  const removeBtn = document.getElementById("removeImageBtn");
  const uploadBtn = document.getElementById("uploadImageBtn");

  if (!previewImg || !placeholder) return;

  if (url) {
    previewImg.src = url;
    previewImg.style.display = "block";
    placeholder.style.display = "none";
    if (removeBtn) removeBtn.style.display = "inline-flex";
    if (uploadBtn) uploadBtn.innerHTML = "🔄 Change Photo";
  } else {
    previewImg.src = "";
    previewImg.style.display = "none";
    placeholder.style.display = "block";
    if (removeBtn) removeBtn.style.display = "none";
    if (uploadBtn) uploadBtn.innerHTML = "📁 Upload Photo";
  }
}

function handleImageFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file (PNG, JPG, WebP, etc.).");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    const rawData = event.target.result;
    const img = new Image();
    img.onload = function() {
      // Resize to max 400x400 to keep localStorage fast
      const maxDim = 400;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const optimizedUrl = canvas.toDataURL("image/jpeg", 0.85);

      document.getElementById("modalImageUrl").value = optimizedUrl;
      updateImagePreview(optimizedUrl);
      showToast("Photo uploaded! Click 'Save Order' to keep it.", "success");
    };
    img.src = rawData;
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}

// Preset Images in Modal
function renderPresetImagesList() {
  const container = document.getElementById("presetImagesContainer");
  if (!container) return;
  container.innerHTML = PRESET_IMAGES.map(img => {
    return `
      <button type="button" class="preset-thumb-btn" onclick="selectPresetImage('${img.url}')" title="${img.name}">
        <img src="${img.url}" alt="${img.name}" />
      </button>
    `;
  }).join("");
}

function selectPresetImage(url) {
  document.getElementById("modalImageUrl").value = url;
  updateImagePreview(url);
  showToast("Preset photo selected", "info");
}

// Handle Order Form Submit
function handleOrderFormSubmit(e) {
  e.preventDefault();

  const productName = document.getElementById("modalProductName").value.trim();
  if (!productName) {
    alert("Please enter a product name.");
    return;
  }

  const platform = document.getElementById("modalPlatform").value;
  const orderNo = document.getElementById("modalOrderNo").value.trim();
  const priceRaw = document.getElementById("modalPrice").value.trim();
  const price = priceRaw !== "" ? Number(priceRaw) : null;
  const quantity = Number(document.getElementById("modalQuantity").value) || 1;
  const paymentMethod = document.getElementById("modalPayment").value;
  const orderedDate = document.getElementById("modalOrderedDate").value;
  const expectedDeliveryDate = document.getElementById("modalExpectedDate").value;
  const actualDeliveryDate = document.getElementById("modalActualDate").value || null;
  let status = document.getElementById("modalStatus").value;
  let received = document.getElementById("modalReceived").checked;
  const image = normalizeImagePath(document.getElementById("modalImageUrl").value.trim());
  const notes = document.getElementById("modalNotes").value.trim();

  // If marked received or status is Delivered
  if (received && status !== "Delivered") {
    status = "Delivered";
  }
  if (status === "Delivered") {
    received = true;
  }

  if (editingOrderId) {
    // Check duplicate order number with other orders
    if (orderNo) {
      const duplicate = orders.find(o => o.id !== editingOrderId && o.orderNo && o.orderNo === orderNo);
      if (duplicate) {
        if (!confirm(`Warning: Order number "${orderNo}" is already used by "${duplicate.productName}". Save anyway?`)) {
          return;
        }
      }
    }

    const o = orders.find(item => item.id === editingOrderId);
    if (o) {
      o.productName = productName;
      o.platform = platform;
      o.orderNo = orderNo;
      o.price = price;
      o.quantity = quantity;
      o.paymentMethod = paymentMethod;
      o.orderedDate = orderedDate;
      o.expectedDeliveryDate = expectedDeliveryDate;
      o.actualDeliveryDate = actualDeliveryDate;
      o.status = status;
      o.received = received;
      o.image = image;
      o.notes = notes;
    }
    showToast("Order updated successfully", "success");
  } else {
    // Check duplicate order number
    if (orderNo) {
      const duplicate = orders.find(o => o.orderNo && o.orderNo === orderNo);
      if (duplicate) {
        if (!confirm(`Warning: Order number "${orderNo}" already exists for "${duplicate.productName}". Add anyway?`)) {
          return;
        }
      }
    }

    const newOrder = {
      id: "ORD-" + Date.now(),
      productName,
      platform,
      orderNo,
      orderedDate,
      expectedDeliveryDate,
      actualDeliveryDate,
      price,
      quantity,
      paymentMethod,
      status,
      received,
      image,
      notes
    };
    orders.unshift(newOrder);
    showToast("New order added successfully", "success");
  }

  saveOrders();
  closeOrderModalHandler();
  renderApp();
}

// Delete Confirmation
function confirmDeleteOrder(orderId) {
  orderToDeleteId = orderId;
  const o = orders.find(item => item.id === orderId);
  if (!o) return;

  const deleteModal = document.getElementById("deleteModal");
  const deleteItemName = document.getElementById("deleteItemName");
  if (deleteItemName) {
    deleteItemName.textContent = o.productName + (o.orderNo ? ` (Order #${o.orderNo})` : "");
  }
  deleteModal.classList.add("open");
}

function deleteOrder(orderId) {
  orders = orders.filter(o => o.id !== orderId);
  saveOrders();
  renderApp();
  showToast("Order deleted", "info");
}

// Copy to Clipboard
function copyToClipboard(text, event) {
  if (event) event.stopPropagation();
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied #${text} to clipboard!`, "success");
  }).catch(() => {
    showToast("Failed to copy", "error");
  });
}

// ==========================================================================
// EXPORTS (Pure Client-side JS)
// ==========================================================================

// 1. Export Excel (.xlsx) with Orders Sheet & Summary Sheet
function exportToExcel() {
  if (typeof XLSX === "undefined") {
    alert("SheetJS library is still loading or unavailable. You can use CSV Export in the meantime!");
    return;
  }

  // Orders Sheet Data
  const headers = [
    "Order ID", "Product Name", "Platform", "Order Number",
    "Price (INR)", "Quantity", "Total (INR)", "Payment Method",
    "Order Date", "Expected Delivery", "Actual Delivery",
    "Status", "Received", "Notes"
  ];

  const rows = orders.map(o => {
    const price = o.price !== null && o.price !== undefined && o.price !== "" ? Number(o.price) : 0;
    const qty = Number(o.quantity) || 1;
    const total = price * qty;
    return [
      o.id || "",
      o.productName || "",
      o.platform || "Meesho",
      o.orderNo || "",
      price || "",
      qty,
      total || "",
      o.paymentMethod || "Cash on Delivery",
      o.orderedDate || "",
      o.expectedDeliveryDate || "",
      o.actualDeliveryDate || "",
      o.status || "Order Placed",
      o.received ? "Yes" : "No",
      o.notes || ""
    ];
  });

  const wsOrders = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  wsOrders["!cols"] = [
    { wch: 14 }, { wch: 38 }, { wch: 14 }, { wch: 22 },
    { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 18 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 10 }, { wch: 35 }
  ];

  // Summary Sheet Data
  let totalCount = orders.length;
  let receivedCount = orders.filter(o => o.received).length;
  let pendingCount = totalCount - receivedCount;
  let totalVal = 0;
  let pendingVal = 0;
  let receivedVal = 0;

  orders.forEach(o => {
    const price = o.price !== null && o.price !== undefined ? Number(o.price) : 0;
    const qty = Number(o.quantity) || 1;
    const itemTotal = price * qty;
    totalVal += itemTotal;
    if (o.received) receivedVal += itemTotal;
    else pendingVal += itemTotal;
  });

  const summaryHeaders = ["Metric", "Value"];
  const summaryRows = [
    ["Total Orders", totalCount],
    ["Delivered / Received", receivedCount],
    ["Pending Deliveries", pendingCount],
    ["Total Order Value (INR)", "₹" + totalVal.toLocaleString("en-IN")],
    ["Pending Amount (INR)", "₹" + pendingVal.toLocaleString("en-IN")],
    ["Received Amount (INR)", "₹" + receivedVal.toLocaleString("en-IN")],
    ["Report Generated", new Date().toLocaleString("en-IN")]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 22 }];

  // Create Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  XLSX.writeFile(wb, "orders.xlsx");
  showToast("Excel report (orders.xlsx) downloaded successfully!", "success");
}

// 2. Export CSV (.csv)
function exportToCSV() {
  const headers = [
    "Order ID", "Product Name", "Platform", "Order Number",
    "Price (INR)", "Quantity", "Total (INR)", "Payment Method",
    "Order Date", "Expected Delivery", "Actual Delivery",
    "Status", "Received", "Notes"
  ];

  const csvRows = [headers.join(",")];

  orders.forEach(o => {
    const price = o.price !== null && o.price !== undefined && o.price !== "" ? Number(o.price) : "";
    const qty = Number(o.quantity) || 1;
    const total = price !== "" ? price * qty : "";

    const row = [
      o.id || "",
      o.productName || "",
      o.platform || "Meesho",
      o.orderNo || "",
      price,
      qty,
      total,
      o.paymentMethod || "Cash on Delivery",
      o.orderedDate || "",
      o.expectedDeliveryDate || "",
      o.actualDeliveryDate || "",
      o.status || "Order Placed",
      o.received ? "Yes" : "No",
      o.notes || ""
    ].map(val => `"${String(val).replace(/"/g, '""')}"`);

    csvRows.push(row.join(","));
  });

  const csvContent = "\ufeff" + csvRows.join("\n"); // UTF-8 BOM
  downloadBlobFile("orders.csv", csvContent, "text/csv;charset=utf-8;");
  showToast("CSV report (orders.csv) downloaded!", "success");
}

// 3. Export Markdown (.md)
function exportToMarkdown() {
  const nowStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  let totalVal = 0;
  let pendingVal = 0;
  let deliveredCount = 0;

  orders.forEach(o => {
    const price = o.price !== null && o.price !== undefined ? Number(o.price) : 0;
    const qty = Number(o.quantity) || 1;
    const itemTotal = price * qty;
    totalVal += itemTotal;
    if (o.received) deliveredCount++;
    else pendingVal += itemTotal;
  });

  let md = `# 📦 Order Tracker Report\n\n`;
  md += `> **Generated on:** ${nowStr}\n\n`;
  md += `## 📊 Summary KPI\n\n`;
  md += `| Metric | Value |\n|:---|---:|\n`;
  md += `| **Total Orders** | \`${orders.length}\` |\n`;
  md += `| **Delivered / Received** | \`${deliveredCount}\` |\n`;
  md += `| **Pending Deliveries** | \`${orders.length - deliveredCount}\` |\n`;
  md += `| **Total Order Value** | **₹${totalVal.toLocaleString("en-IN")}** |\n`;
  md += `| **Pending Amount** | **₹${pendingVal.toLocaleString("en-IN")}** |\n\n`;

  md += `## 📋 Orders List\n\n`;
  md += `| # | Product Name | Platform | Order Number | Price | Qty | Expected Delivery | Status | Received |\n`;
  md += `|:-:|:---|:---:|:---:|---:|:-:|:---:|:---:|:---:|\n`;

  orders.forEach((o, i) => {
    const priceStr = o.price !== null && o.price !== "" ? `₹${Number(o.price).toLocaleString("en-IN")}` : "*Not entered*";
    const recStr = o.received ? "✅ Yes" : "⬜ No";
    const ordNo = o.orderNo ? `\`${o.orderNo}\`` : "—";
    md += `| ${i + 1} | **${o.productName}** | ${o.platform || "Meesho"} | ${ordNo} | ${priceStr} | ${o.quantity || 1} | ${o.expectedDeliveryDate || "—"} | ${o.status} | ${recStr} |\n`;
  });

  downloadBlobFile("orders.md", md, "text/markdown;charset=utf-8;");
  showToast("Markdown report (orders.md) downloaded!", "success");
}

// 4. Backup to JSON
function backupToJSON() {
  const jsonStr = JSON.stringify(orders, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadBlobFile(`orders_backup_${dateStr}.json`, jsonStr, "application/json");
  showToast("JSON backup downloaded successfully!", "success");
}

// 5. Restore from JSON
function handleRestoreJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!Array.isArray(data)) {
        alert("Invalid backup file. JSON must contain an array of orders.");
        return;
      }
      if (confirm(`Restore ${data.length} orders from backup? This will replace your current records.`)) {
        orders = data;
        saveOrders();
        renderApp();
        showToast(`Successfully restored ${data.length} orders!`, "success");
      }
    } catch (err) {
      alert("Failed to parse JSON file: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// 6. Import from CSV with Duplicate Prevention
function handleImportCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const text = event.target.result;
      parseAndImportCSV(text);
    } catch (err) {
      alert("Error reading CSV: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function parseAndImportCSV(csvText) {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    alert("CSV file has no data rows.");
    return;
  }

  // Parse CSV Line (handles quotes)
  function parseCSVLine(line) {
    const row = [];
    let inQuotes = false;
    let curr = "";
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          curr += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push(curr.trim());
        curr = "";
      } else {
        curr += c;
      }
    }
    row.push(curr.trim());
    return row;
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  
  function findIdx(...names) {
    for (const n of names) {
      const idx = headers.findIndex(h => h.includes(n));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const nameIdx = findIdx("product", "item", "title", "name");
  const platIdx = findIdx("platform", "website", "store");
  const noIdx = findIdx("order no", "order number", "order_id", "order id");
  const priceIdx = findIdx("price", "amount", "cost");
  const qtyIdx = findIdx("quantity", "qty");
  const payIdx = findIdx("payment", "method");
  const ordDateIdx = findIdx("ordered", "order date");
  const expDateIdx = findIdx("expected", "delivery date", "due");
  const statusIdx = findIdx("status");
  const recIdx = findIdx("received", "delivered");
  const notesIdx = findIdx("notes", "note", "comment");

  if (nameIdx === -1) {
    alert("Could not find a 'Product Name' or 'Item' column in your CSV.");
    return;
  }

  const existingOrderNos = new Set(orders.map(o => (o.orderNo || "").trim()).filter(Boolean));
  const existingKeys = new Set(orders.map(o => `${(o.productName || "").toLowerCase().trim()}|${(o.platform || "").toLowerCase()}`));

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (!row || row.length === 0) continue;

    const pName = row[nameIdx] || "";
    if (!pName) continue;

    const pPlat = platIdx !== -1 && row[platIdx] ? row[platIdx] : "Meesho";
    const pOrderNo = noIdx !== -1 && row[noIdx] ? row[noIdx] : "";
    const pPriceRaw = priceIdx !== -1 && row[priceIdx] ? row[priceIdx].replace(/[^0-9.]/g, "") : "";
    const pPrice = pPriceRaw ? Number(pPriceRaw) : null;
    const pQty = qtyIdx !== -1 && row[qtyIdx] ? parseInt(row[qtyIdx], 10) || 1 : 1;
    const pPayment = payIdx !== -1 && row[payIdx] ? row[payIdx] : "Cash on Delivery";
    const pOrdDate = ordDateIdx !== -1 && row[ordDateIdx] ? row[ordDateIdx] : "";
    const pExpDate = expDateIdx !== -1 && row[expDateIdx] ? row[expDateIdx] : "";
    const pStatus = statusIdx !== -1 && row[statusIdx] ? row[statusIdx] : "Order Placed";
    const pRec = recIdx !== -1 && row[recIdx] ? ["yes", "true", "1", "delivered"].includes(row[recIdx].toLowerCase()) : false;
    const pNotes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : "";

    // Duplicate check
    const isDup = (pOrderNo && existingOrderNos.has(pOrderNo)) || existingKeys.has(`${pName.toLowerCase().trim()}|${pPlat.toLowerCase()}`);
    if (isDup) {
      skipped++;
      continue;
    }

    orders.unshift({
      id: "ORD-" + (Date.now() + imported),
      productName: pName,
      platform: pPlat,
      orderNo: pOrderNo,
      orderedDate: pOrdDate,
      expectedDeliveryDate: pExpDate,
      actualDeliveryDate: pRec ? new Date().toISOString().slice(0, 10) : null,
      price: pPrice,
      quantity: pQty,
      paymentMethod: pPayment,
      status: pRec ? "Delivered" : pStatus,
      received: pRec,
      image: "",
      notes: pNotes
    });

    if (pOrderNo) existingOrderNos.add(pOrderNo);
    existingKeys.add(`${pName.toLowerCase().trim()}|${pPlat.toLowerCase()}`);
    imported++;
  }

  saveOrders();
  renderApp();
  alert(`Import Finished!\n✅ Imported: ${imported} orders\n⚠️ Skipped Duplicates: ${skipped}`);
}

// Download Helper
function downloadBlobFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Toast Notifications
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
    <div>${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Escape HTML
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
