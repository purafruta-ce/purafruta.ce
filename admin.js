import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ======== CONFIG (PREENCHA) ========
const SUPABASE_URL = "https://phprflfozghmzzlewljx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocHJmbGZvemdobXp6bGV3bGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTMwMjYsImV4cCI6MjA4NjIyOTAyNn0.l3ShFArGCK-raOOcLUjkE8M8F0fXyM4WoHaTT6wBt4Q";
// ===================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBox = document.getElementById("loginBox");
const panel = document.getElementById("panel");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const panelMsg = document.getElementById("panelMsg");
const tableWrap = document.getElementById("tableWrap");

function setMsg(el, msg) {
  el.textContent = msg || "";
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

async function requireAdmin() {
  // Se não for admin, o UPDATE vai falhar por RLS.
  // Aqui a gente só garante que está autenticado, e trata erro no update.
  const { data } = await supabase.auth.getSession();
  const authed = !!data?.session;
  loginBox.hidden = authed;
  panel.hidden = !authed;
  logoutBtn.hidden = !authed;
  if (authed) await loadProducts();
}

async function loadProducts() {
  setMsg(panelMsg, "Carregando produtos…");
  tableWrap.innerHTML = "";

  const { data, error } = await supabase
    .from("products")
    .select("sku, name, price, stock, updated_at")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    setMsg(panelMsg, "Erro ao carregar produtos. Verifique sua anon key e RLS.");
    return;
  }

  tableWrap.innerHTML = renderTable(data);
  bindTableActions();
  setMsg(panelMsg, `Produtos carregados: ${data.length}`);
}

function renderTable(rows) {
  const tr = rows.map(r => `
    <tr data-sku="${esc(r.sku)}">
      <td class="code">${esc(r.sku)}</td>
      <td>${esc(r.name)}</td>
      <td>${Number(r.price).toFixed(2)}</td>
      <td>
        <div class="row-actions">
          <button class="btn small js-dec" type="button">−</button>
          <input class="stock-input" type="number" min="0" step="1" value="${Number(r.stock)}" />
          <button class="btn small js-inc" type="button">+</button>
        </div>
      </td>
      <td class="code">${esc(new Date(r.updated_at).toLocaleString("pt-BR"))}</td>
      <td>
        <button class="btn btn-primary small js-save" type="button">Salvar</button>
      </td>
    </tr>
  `).join("");

  return `
    <table>
      <thead>
        <tr>
          <th>SKU</th>
          <th>Nome</th>
          <th>Preço</th>
          <th>Estoque</th>
          <th>Atualizado</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>${tr}</tbody>
    </table>
  `;
}

function bindTableActions() {
  tableWrap.querySelectorAll("tr[data-sku]").forEach(row => {
    const sku = row.dataset.sku;
    const input = row.querySelector("input.stock-input");

    row.querySelector(".js-dec").addEventListener("click", () => {
      input.value = String(Math.max(0, Number(input.value || 0) - 1));
    });
    row.querySelector(".js-inc").addEventListener("click", () => {
      input.value = String(Math.max(0, Number(input.value || 0) + 1));
    });

    row.querySelector(".js-save").addEventListener("click", async () => {
      const next = Math.max(0, Number(input.value || 0));
      setMsg(panelMsg, `Salvando ${sku}…`);

      const { error } = await supabase
        .from("products")
        .update({ stock: next, updated_at: new Date().toISOString() })
        .eq("sku", sku);

      if (error) {
        console.error(error);
        setMsg(panelMsg, "Sem permissão para alterar estoque. Você está logado como admin?");
        return;
      }

      setMsg(panelMsg, `Estoque atualizado: ${sku} = ${next}`);
      await loadProducts();
    });
  });
}

// ======== AUTH ========
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(loginMsg, "Entrando…");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(error);
    setMsg(loginMsg, "Falha no login. Confira email e senha.");
    return;
  }

  setMsg(loginMsg, "");
  await requireAdmin();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  setMsg(panelMsg, "");
  tableWrap.innerHTML = "";
  await requireAdmin();
});

refreshBtn.addEventListener("click", loadProducts);

// Inicial
await requireAdmin();
supabase.auth.onAuthStateChange(async () => {
  await requireAdmin();
});
