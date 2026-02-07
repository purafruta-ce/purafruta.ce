// =============================
// CONFIG
// =============================
const PHONE = "5585985614777"; // WhatsApp Pura Fruta
const DEFAULT_MESSAGE = "Olá! 👋 Gostaria de fazer um pedido na Pura Fruta. Pode me ajudar?";

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
// CTA WHATS (Topo + FAB)
// =============================
const ctaWhats = document.getElementById("ctaWhats");
const fabWhats = document.getElementById("fabWhats");
ctaWhats.href = waLink(DEFAULT_MESSAGE);
fabWhats.href = waLink(DEFAULT_MESSAGE);

// =============================
// PEDIR PRODUTO (WhatsApp)
// =============================
document.querySelectorAll(".js-order").forEach(btn => {
  btn.addEventListener("click", () => {
    const product = btn.dataset.product || "Produto";
    const price = btn.dataset.price || "--";

    const message =
`Olá! 
Quero pedir na Pura Fruta:

 ${product}
 R$ ${price}

Atende Fortaleza-CE? Como funciona entrega/retirada?`;

    window.open(waLink(message), "_blank", "noopener");
    toast(`Pedido pronto: ${product}`);
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
