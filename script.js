// =============================
// CONFIG
// =============================
const PHONE = "5585985614777"; // WhatsApp Pura Fruta
const DEFAULT_MESSAGE = "Olá! 👋 Gostaria de fazer um pedido na Pura Fruta. Pode me ajudar?";

// =============================
// CART STATE
// =============================
let cart = JSON.parse(localStorage.getItem("purafruta_cart")) || [];

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

// =============================
// CART FUNCTIONS
// =============================
function saveCart() {
  localStorage.setItem("purafruta_cart", JSON.stringify(cart));
}

function addToCart(product, price) {
  const existingItem = cart.find(item => item.product === product);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ product, price: parseFloat(price), quantity: 1 });
  }
  saveCart();
  updateCartUI();
  toast(`${product} adicionado ao carrinho!`);
}

function removeFromCart(product) {
  cart = cart.filter(item => item.product !== product);
  saveCart();
  updateCartUI();
}

function updateCartItemQty(product, quantity) {
  const item = cart.find(item => item.product === product);
  if (item) {
    item.quantity = Math.max(1, quantity);
    saveCart();
    updateCartUI();
  }
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
}

function getCartTotal() {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function updateCartUI() {
  const badge = document.getElementById("cartBadge");
  const itemsContainer = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  const cartOrderBtn = document.getElementById("cartOrderBtn");

  // Update badge
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = totalItems;

  // Update items display
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

    // Add event listeners for quantity controls
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
        if (item) updateCartItemQty(product, item.quantity + 1);
      });
    });

    document.querySelectorAll(".cart-item__remove").forEach(btn => {
      btn.addEventListener("click", () => {
        removeFromCart(btn.dataset.product);
      });
    });
  }

  // Update total
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

hamb.addEventListener("click", () => {
  const isOpen = menuMobile.classList.toggle("is-open");
  hamb.setAttribute("aria-expanded", String(isOpen));
});

// Fecha menu ao clicar
menuMobile.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => {
    menuMobile.classList.remove("is-open");
    hamb.setAttribute("aria-expanded", "false");
  });
});

// Fecha ao clicar fora
document.addEventListener("click", (e) => {
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
const cartModal = document.getElementById("cartModal");
const cartOverlay = document.getElementById("cartOverlay");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartClearBtn = document.getElementById("cartClearBtn");

cartBtn.addEventListener("click", toggleCartModal);
closeCartBtn.addEventListener("click", toggleCartModal);
cartOverlay.addEventListener("click", toggleCartModal);

cartClearBtn.addEventListener("click", () => {
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
ctaWhats.href = waLink(DEFAULT_MESSAGE);
fabWhats.href = waLink(DEFAULT_MESSAGE);

// =============================
// CART ORDER
// =============================
const cartOrderBtn = document.getElementById("cartOrderBtn");

cartOrderBtn.addEventListener("click", () => {
  if (cart.length === 0) {
    toast("Carrinho vazio!");
    return;
  }

  let message = "Olá! \nGostaria de fazer este pedido na Pura Fruta:\n\n";
  
  cart.forEach(item => {
    message += `${item.product}\n   Qtd: ${item.quantity} x ${formatPrice(item.price)}\n`;
  });

  message += `\n Total: ${formatPrice(getCartTotal())}\n\nAtende Fortaleza-CE? Como funciona entrega/retirada?`;

  window.open(waLink(message), "_blank", "noopener");
  
  // Fechar modal
  toggleCartModal();
  clearCart();
  toast("Pedido enviado com sucesso!");
});

// =============================
// ADD TO CART BUTTONS
// =============================
document.querySelectorAll(".js-add-cart").forEach(btn => {
  btn.addEventListener("click", () => {
    const product = btn.dataset.product || "Produto";
    const price = btn.dataset.price || "0";
    addToCart(product, price);
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
  const q = (searchInput.value || "").trim().toLowerCase();

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

  hint.textContent = visible === 0
    ? "Nenhum item encontrado. Tente outra busca ou filtre novamente."
    : `${visible} item(ns) encontrado(s).`;
}

searchInput.addEventListener("input", applyFilters);

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    chips.forEach(c => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    activeFilter = chip.dataset.filter;
    applyFilters();
  });
});

// Inicial
applyFilters();
updateCartUI();

