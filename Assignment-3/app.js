/* ═══════════════════════════════════════════════
   DRAPE — Fashion Store  |  app.js
   Features: search, category filter, sort, cart, wishlist, toast
   ═══════════════════════════════════════════════ */

// ── Product Data ──────────────────────────────────────────────────────────────
const PRODUCTS = [
  // Tops
  { id: 1,  name: "Linen Oversized Shirt",      category: "tops",        price: 1499, originalPrice: null, rating: 4.5, reviews: 128, badge: "new",  emoji: "👕" },
  { id: 2,  name: "Ribbed Crop Tank",           category: "tops",        price: 699,  originalPrice: 999,  rating: 4.2, reviews: 86,  badge: "sale", emoji: "🎽" },
  { id: 3,  name: "Striped Polo Shirt",         category: "tops",        price: 1199, originalPrice: null, rating: 4.6, reviews: 204, badge: null,   emoji: "👔" },
  { id: 4,  name: "Graphic Band Tee",           category: "tops",        price: 799,  originalPrice: null, rating: 4.1, reviews: 67,  badge: null,   emoji: "👕" },
  { id: 5,  name: "Satin Wrap Blouse",          category: "tops",        price: 1899, originalPrice: 2499, rating: 4.7, reviews: 155, badge: "sale", emoji: "👚" },

  // Bottoms
  { id: 6,  name: "Wide-Leg Linen Trousers",   category: "bottoms",     price: 2199, originalPrice: null, rating: 4.8, reviews: 312, badge: "new",  emoji: "👖" },
  { id: 7,  name: "Cargo Utility Pants",        category: "bottoms",     price: 1799, originalPrice: null, rating: 4.3, reviews: 98,  badge: null,   emoji: "🩳" },
  { id: 8,  name: "Pleated Midi Skirt",         category: "bottoms",     price: 1599, originalPrice: 2199, rating: 4.6, reviews: 189, badge: "sale", emoji: "👗" },
  { id: 9,  name: "Slim Tapered Chinos",        category: "bottoms",     price: 1999, originalPrice: null, rating: 4.4, reviews: 143, badge: null,   emoji: "👖" },

  // Outerwear
  { id: 10, name: "Trench Coat",                category: "outerwear",   price: 5999, originalPrice: null, rating: 4.9, reviews: 421, badge: "new",  emoji: "🧥" },
  { id: 11, name: "Sherpa Zip-Up Jacket",       category: "outerwear",   price: 3499, originalPrice: 4999, rating: 4.7, reviews: 267, badge: "sale", emoji: "🧥" },
  { id: 12, name: "Tailored Blazer",            category: "outerwear",   price: 4299, originalPrice: null, rating: 4.8, reviews: 184, badge: null,   emoji: "🥼" },
  { id: 13, name: "Denim Jacket",               category: "outerwear",   price: 2799, originalPrice: null, rating: 4.5, reviews: 302, badge: null,   emoji: "🧥" },

  // Accessories
  { id: 14, name: "Leather Tote Bag",           category: "accessories", price: 2499, originalPrice: null, rating: 4.6, reviews: 78,  badge: "new",  emoji: "👜" },
  { id: 15, name: "Woven Bucket Hat",           category: "accessories", price: 699,  originalPrice: null, rating: 4.3, reviews: 55,  badge: null,   emoji: "🪣" },
  { id: 16, name: "Minimal Watch",              category: "accessories", price: 3999, originalPrice: 5499, rating: 4.8, reviews: 210, badge: "sale", emoji: "⌚" },
  { id: 17, name: "Gold Chain Necklace",        category: "accessories", price: 1299, originalPrice: null, rating: 4.4, reviews: 92,  badge: null,   emoji: "📿" },
  { id: 18, name: "Canvas Belt",               category: "accessories", price: 599,  originalPrice: null, rating: 4.1, reviews: 44,  badge: null,   emoji: "👝" },

  // Footwear
  { id: 19, name: "Suede Chelsea Boots",        category: "footwear",    price: 4999, originalPrice: null, rating: 4.9, reviews: 337, badge: "new",  emoji: "👢" },
  { id: 20, name: "Minimalist White Sneakers",  category: "footwear",    price: 2999, originalPrice: 3999, rating: 4.7, reviews: 498, badge: "sale", emoji: "👟" },
  { id: 21, name: "Woven Sandals",              category: "footwear",    price: 1499, originalPrice: null, rating: 4.3, reviews: 122, badge: null,   emoji: "👡" },
  { id: 22, name: "Loafers",                    category: "footwear",    price: 3499, originalPrice: null, rating: 4.6, reviews: 201, badge: null,   emoji: "🥿" },
];

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  search:    "",
  category:  "all",
  sort:      "default",
  cart:      0,
  wishlist:  new Set(),
};

// ── DOM References ─────────────────────────────────────────────────────────────
const grid           = document.getElementById("productGrid");
const emptyState     = document.getElementById("emptyState");
const resultsCount   = document.getElementById("resultsCount");
const cartBadge      = document.getElementById("cartBadge");
const searchInput    = document.getElementById("searchInput");
const sortSelect     = document.getElementById("sortSelect");
const categoryBtns   = document.querySelectorAll(".filter-btn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const toast          = document.getElementById("toast");

// ── Helpers ───────────────────────────────────────────────────────────────────
function stars(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

function formatPrice(n) {
  return "₹" + n.toLocaleString("en-IN");
}

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 280);
  }, 2200);
}

// ── Filter + Sort ─────────────────────────────────────────────────────────────
function getFiltered() {
  let list = PRODUCTS.filter(p => {
    const matchesSearch   = p.name.toLowerCase().includes(state.search.toLowerCase());
    const matchesCategory = state.category === "all" || p.category === state.category;
    return matchesSearch && matchesCategory;
  });

  switch (state.sort) {
    case "price-asc":  list.sort((a, b) => a.price - b.price);                          break;
    case "price-desc": list.sort((a, b) => b.price - a.price);                          break;
    case "name-asc":   list.sort((a, b) => a.name.localeCompare(b.name));               break;
    case "name-desc":  list.sort((a, b) => b.name.localeCompare(a.name));               break;
    case "rating":     list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews); break;
    default: break; // featured — original order
  }

  return list;
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const filtered = getFiltered();
  grid.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    resultsCount.textContent = "0 products";
    return;
  }

  emptyState.classList.add("hidden");
  resultsCount.textContent = `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`;

  filtered.forEach(p => {
    const wishlisted = state.wishlist.has(p.id);
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = p.id;

    card.innerHTML = `
      <div class="card-img-wrap">
        <div class="card-emoji">${p.emoji}</div>
        ${p.badge ? `<span class="card-badge badge-${p.badge}">${p.badge}</span>` : ""}
        <button
          class="card-wishlist${wishlisted ? " wishlisted" : ""}"
          data-id="${p.id}"
          title="${wishlisted ? "Remove from wishlist" : "Add to wishlist"}"
          aria-label="Wishlist"
        >${wishlisted ? "♥" : "♡"}</button>
      </div>
      <div class="card-body">
        <p class="card-category">${p.category}</p>
        <h2 class="card-name">${p.name}</h2>
        <div class="card-rating">
          <span class="stars">${stars(p.rating)}</span>
          <span class="rating-count">${p.rating} (${p.reviews})</span>
        </div>
        <div class="card-footer">
          <div class="card-price">
            ${formatPrice(p.price)}
            ${p.originalPrice ? `<span class="original">${formatPrice(p.originalPrice)}</span>` : ""}
          </div>
          <button class="add-to-cart" data-id="${p.id}">+ Add</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// ── Event: Search ─────────────────────────────────────────────────────────────
searchInput.addEventListener("input", e => {
  state.search = e.target.value.trim();
  render();
});

// ── Event: Category filter ────────────────────────────────────────────────────
categoryBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    categoryBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.category = btn.dataset.filter;
    render();
  });
});

// ── Event: Sort ───────────────────────────────────────────────────────────────
sortSelect.addEventListener("change", e => {
  state.sort = e.target.value;
  render();
});

// ── Event: Cart + Wishlist (delegated) ───────────────────────────────────────
grid.addEventListener("click", e => {

  // Add to cart
  const cartBtn = e.target.closest(".add-to-cart");
  if (cartBtn) {
    const id = Number(cartBtn.dataset.id);
    const product = PRODUCTS.find(p => p.id === id);
    state.cart++;
    cartBadge.textContent = state.cart;
    showToast(`🛍 "${product.name}" added to cart`);
    return;
  }

  // Wishlist toggle
  const wlBtn = e.target.closest(".card-wishlist");
  if (wlBtn) {
    const id = Number(wlBtn.dataset.id);
    const product = PRODUCTS.find(p => p.id === id);
    if (state.wishlist.has(id)) {
      state.wishlist.delete(id);
      showToast(`Removed from wishlist`);
    } else {
      state.wishlist.add(id);
      showToast(`♥ Added to wishlist`);
    }
    render();
    return;
  }
});

// ── Event: Clear filters ──────────────────────────────────────────────────────
clearFiltersBtn.addEventListener("click", () => {
  state.search   = "";
  state.category = "all";
  state.sort     = "default";
  searchInput.value   = "";
  sortSelect.value    = "default";
  categoryBtns.forEach(b => b.classList.remove("active"));
  document.querySelector('[data-filter="all"]').classList.add("active");
  render();
});

// ── Init ──────────────────────────────────────────────────────────────────────
render();
