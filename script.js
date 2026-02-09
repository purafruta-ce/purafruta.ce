import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================
// CONFIG
// =============================
const PHONE = "5585985614777";
const DEFAULT_MESSAGE = "Olá! 👋 Gostaria de fazer um pedido na Pura Fruta. Pode me ajudar?";

// >>>>> PREENCHA AQUI <<<<<
const SUPABASE_URL = "https://phprflfozghmzzlewljx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocHJmbGZvemdobXp6bGV3bGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTMwMjYsImV4cCI6MjA4NjIyOTAyNn0.l3ShFArGCK-raOOcLUjkE8M8F0fXyM4WoHaTT6wBt4Q";
const CHECKOUT_FUNCTION_URL = "https://phprflfozghmzzlewljx.supabase.co/functions/v1/checkout";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================
// STATE
// =============================
let cart = JSON.parse(localStorage.getItem("purafruta_cart")) || [];
let stockMap = {}; // sku -> stock (inteiro)

// =============================
// HELPERS
// =============================
function waLink(message) {
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.remove("show"), 1600);
}

function formatPrice(price) {
  const num = typeof price === "string" ? parseFloat(price.replace(",", ".")) : price;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function saveCart() {
  localStorage.setItem("purafruta_cart", JSON.stringify(cart));
}

function getSkuFromButton(btn) {
  return btn.dataset.sku || btn.dataset.product;
}

function getAvailableStockForSku(sku) {
  const raw = Number(stockMap[sku] ?? 0);
  const inCart = cart
    .filter(i => (i.sku || i.product) === sku)
    .reduce((s, i) => s + i.quantity, 0);

  return Math.max(0, raw - inCart);
}

// =============================
// STOCK UI
// =============================
function refreshStockUI() {
  document.querySelectorAll(".card").forEach(card => {
    const sku = card.dataset.sku;
    if (!sku) return;

    const available = getAvailableStockForSku(sku);

    const stockEl = card.querySelector(".stock");
    if (stockEl) {
      stockEl.classList.remove("is-low", "is-out");
      if (available <= 0) {
        stockEl.textContent = "Esgotado";
        stockEl.classList.add("is-out");
      } else {
        stockEl.textContent = `Em estoque: ${available}`;
        if (available <= 5) stockEl.classList.add("is-low");
      }
    }

    const btn = card.querySelector(".js-add-cart");
    if (btn) {
      const soldout = available <= 0;
      btn.disabled = soldout;
      btn.classList.toggle("is-soldout", soldout);
      btn.textContent = soldout ? "Esgotado" : "Carrinho";
    }
  });
}

async function loadStockFromDB() {
  const { data, error } = await supabase
    .from("products")
    .select("sku, stock");

  if (error) {
    console.error(error);
    toast("Falha ao carregar estoque.");
    return;
  }

  stockMap = {};
  for (const p of data) stockMap[p.sku] = p.stock;

  refreshStockUI();
}

// =============================
// CART
// =============================
function addToCart(product, price, sku) {
  const key = sku || product;
  const available = getAvailableStockForSku(key);

  if (available <= 0) {
    toast("Sem estoque disponível.");
    refreshStockUI();
    return;
  }

  const existingItem = cart.find(item => (item.sku || item.product) === key);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ sku: key, product, price: parseFloat(price), quantity: 1 });
  }

  saveCart();
  updateCartUI();
  refreshStockUI();
  toast(`${product} adicionado ao carrinho!`);
}

function removeFromCart(productName) {
  cart = cart.filter(item => item.product !== productName);
  saveCart();
  updateCartUI();
  refreshStockUI();
}

function updateCartItemQty(productName, nextQty) {
  const item = cart.find(i => i.product === productName);
  if (!item) return;

  const key = item.sku || item.product;
  const maxAllowed = Number(stockMap[key] ?? 0);

  item.quantity = Math.min(Math.max(1, nextQty), maxAllowed);

  saveCart();
  updateCartUI();
  refreshStockUI();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
  refreshStockUI();
}

function getCartTotal() {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function updateCartUI() {
  const badge = document.getElementById("cartBadge");
  const itemsContainer = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  const cartOrderBtn = document.getElementById("cartOrderBtn");

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = totalItems;

  if (cart.length === 0) {
    itemsContainer.innerHTML = '<p class="cart-empty">Seu carrinho está vazio</p>';
    cartOrderBtn.disabled = true;
  } else {
    itemsContainer.innerHTML = cart.map((item) => `
      <div class="cart-item">
        <div class="cart-item__info">
          <h3>${item.product}</h3>
          <div class="cart-item__price">${formatPrice(item.price)}</div>
          <div class="cart-item__qty">
            <button type="button" data-product="${item.product}" class="qty-minus">−</button>
            <input type="number" min="1" value="${item.quantity}" data-product="${item.product}" class="qty-input" readonly />
            <button type="button" data-product="${item.product}" class="qty-plus">+</button>
          </div>
          <button type="button" class="cart-item__remove" data-product="${item.product}">Remover</button>
        </div>
      </div>
    `).join("");

    cartOrderBtn.disabled = false;

    document.querySelectorAll(".qty-minus").forEach(btn => {
      btn.addEventListener("click", () => {
        const product = btn.dataset.product;
        const item = cart.find(i => i.product === product);
        if (item) updateCartItemQty(product, item.quantity - 1);
      });
    });

    document.querySelectorAll(".qty-plus").forEach(btn => {
      btn.addEventListener("click", () => {
        const product = btn.dataset.product;
        const item = cart.find(i => i.product === product);
        if (!item) return;

        const key = item.sku || item.product;
        if (getAvailableStockForSku(key) <= 0) {
          toast("Limite do estoque atingido.");
          return;
        }
        updateCartItemQty(product, item.quantity + 1);
      });
    });

    document.querySelectorAll(".cart-item__remove").forEach(btn => {
      btn.addEventListener("click", () => removeFromCart(btn.dataset.product));
    });
  }

  totalEl.textContent = formatPrice(getCartTotal());
}

function toggleCartModal() {
  const modal = document.getElementById("cartModal");
  modal.classList.toggle("is-open");
  document.body.style.overflow = modal.classList.contains("is-open") ? "hidden" : "";
}

// =============================
// MENU MOBILE
// =============================
const hamb = document.querySelector(".hamb");
const menuMobile = document.getElementById("menuMobile");

hamb?.addEventListener("click", () => {
  const isOpen = menuMobile.classList.toggle("is-open");
  hamb.setAttribute("aria-expanded", String(isOpen));
});

menuMobile?.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => {
    menuMobile.classList.remove("is-open");
    hamb.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("click", (e) => {
  if (!menuMobile || !hamb) return;
  const clickedInside = menuMobile.contains(e.target) || hamb.contains(e.target);
  if (!clickedInside && menuMobile.classList.contains("is-open")) {
    menuMobile.classList.remove("is-open");
    hamb.setAttribute("aria-expanded", "false");
  }
});

// =============================
// CART MODAL CONTROLS
// =============================
const cartBtn = document.getElementById("cartBtn");
const cartOverlay = document.getElementById("cartOverlay");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartClearBtn = document.getElementById("cartClearBtn");

cartBtn?.addEventListener("click", toggleCartModal);
closeCartBtn?.addEventListener("click", toggleCartModal);
cartOverlay?.addEventListener("click", toggleCartModal);

cartClearBtn?.addEventListener("click", () => {
  if (cart.length > 0 && confirm("Deseja limpar o carrinho?")) {
    clearCart();
    toast("Carrinho limpo!");
  }
});

// =============================
// CTA WHATS (Topo + FAB)
// =============================
const ctaWhats = document.getElementById("ctaWhats");
const fabWhats = document.getElementById("fabWhats");
if (ctaWhats) ctaWhats.href = waLink(DEFAULT_MESSAGE);
if (fabWhats) fabWhats.href = waLink(DEFAULT_MESSAGE);

// =============================
// CART ORDER (checkout -> baixa estoque -> abre WhatsApp)
// =============================
const cartOrderBtn = document.getElementById("cartOrderBtn");

cartOrderBtn?.addEventListener("click", async () => {
  if (cart.length === 0) {
    toast("Carrinho vazio!");
    return;
  }

  const items = cart.map(i => ({
    sku: i.sku || i.product,
    qty: i.quantity
  }));

  let resp;
  try {
    resp = await fetch(CHECKOUT_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });
  } catch (e) {
    console.error(e);
    toast("Falha de conexão. Tente novamente.");
    return;
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    toast(err.message || "Estoque insuficiente. Atualize e tente novamente.");
    await loadStockFromDB();
    updateCartUI();
    return;
  }

  // ok: baixou estoque no backend
  let message = "Olá! \nGostaria de fazer este pedido na Pura Fruta:\n\n";
  cart.forEach(item => {
    message += `${item.product}\n   Qtd: ${item.quantity} x ${formatPrice(item.price)}\n`;
  });
  message += `\n Total: ${formatPrice(getCartTotal())}\n\nAtende Fortaleza-CE? Como funciona entrega/retirada?`;

  window.open(waLink(message), "_blank", "noopener");

  toggleCartModal();
  clearCart();
  await loadStockFromDB();
  toast("Pedido confirmado! ✅");
});

// =============================
// ADD TO CART BUTTONS
// =============================
document.querySelectorAll(".js-add-cart").forEach(btn => {
  btn.addEventListener("click", () => {
    const product = btn.dataset.product || "Produto";
    const price = btn.dataset.price || "0";
    const sku = getSkuFromButton(btn);
    addToCart(product, price, sku);
  });
});

// =============================
// BUSCA + FILTRO
// =============================
const searchInput = document.getElementById("searchInput");
const chips = document.querySelectorAll(".chip");
const cards = Array.from(document.querySelectorAll(".card"));
const hint = document.getElementById("resultHint");

let activeFilter = "all";

function applyFilters() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  let visible = 0;

  for (const card of cards) {
    const name = (card.dataset.name || "").toLowerCase();
    const cat = (card.dataset.category || "").toLowerCase();

    const matchesSearch = !q || name.includes(q);
    const matchesFilter = activeFilter === "all" || cat.includes(activeFilter);

    const show = matchesSearch && matchesFilter;
    card.style.display = show ? "" : "none";
    if (show) visible++;
  }

  if (hint) {
    hint.textContent = visible === 0
      ? "Nenhum item encontrado. Tente outra busca ou filtre novamente."
      : `${visible} item(ns) encontrado(s).`;
  }
}

searchInput?.addEventListener("input", applyFilters);

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    chips.forEach(c => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    activeFilter = chip.dataset.filter;
    applyFilters();
  });
});

// =============================
// INIT
// =============================
applyFilters();
updateCartUI();
await loadStockFromDB();
refreshStockUI();


