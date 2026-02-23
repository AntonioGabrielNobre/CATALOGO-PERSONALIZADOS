// 1. Configurações
const SUPABASE_URL = 'https://injsohwfskwhkayeywed.supabase.co';
const SUPABASE_KEY = 'sb_publishable_j4BOfsBLWhDw9kJrpByL6w_U607v2AD';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variáveis Globais
let currentUserRole = '';
let allOrdersData = [];
let inventory = [];
let statusChart, storeChart;

// --- FUNÇÃO DE IMAGEM (RESTAURADA) ---
function convertDriveLink(url) {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        let fileId = "";
        const parts = url.match(/\/file\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
        if (parts && parts[1]) {
            fileId = parts[1];
            // Usando o link de visualização direta que você tinha
            return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
        }
    }
    return url;
}

// --- LOGIN ---
async function handleLogin() {
    const user = document.getElementById('userLogin').value;
    const pass = document.getElementById('userPass').value;

    try {
        const { data, error } = await supabaseClient
            .from('logins')
            .select('*')
            .eq('login', user)
            .eq('senha', pass)
            .single();

        if (error || !data) {
            alert("Usuário ou senha incorretos!");
            return;
        }

        // --- AJUSTE AQUI: Trocamos 'role' por 'nivel' ---
        currentUserRole = String(data.nivel || 'vendedor').toLowerCase().trim();

        console.log("Login OK! Nível detectado:", currentUserRole);

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';

        await loadAllData();

    } catch (err) {
        console.error("Erro no login:", err.message);
    }
}

// --- CARREGAR DADOS ---
async function loadAllData() {
    const adminPanel = document.getElementById('adminPanel');
    const catalogPanel = document.getElementById('catalogPanel');
    const swipeWrapper = document.getElementById('swipeWrapper');

    // 1. Configuração de Layout conforme o cargo
    if (currentUserRole === 'admin') {
        console.log("Modo Admin: Preparando Abas (Dashboard | Catálogo)");

        // Ativa o container de abas
        swipeWrapper.style.display = 'flex';
        swipeWrapper.style.width = '200%';

        // Garante que ambos os painéis ocupem 50% do wrapper (100% da tela cada)
        adminPanel.style.display = 'block';
        adminPanel.style.width = '50%';
        catalogPanel.style.display = 'block';
        catalogPanel.style.width = '50%';

        initSwipe(); // Inicializa o Hammer.js
        switchTab(0); // Força começar no Dashboard (Aba 1)
    } else {
        console.log("Modo Vendedor: Layout Único (Catálogo)");

        // Reseta tudo para layout simples
        swipeWrapper.style.display = 'block';
        swipeWrapper.style.width = '100%';
        swipeWrapper.style.transform = 'none';

        adminPanel.style.display = 'none';
        catalogPanel.style.display = 'block';
        catalogPanel.style.width = '100%';
    }

    // 2. Busca de dados
    try {
        const { data: orders } = await supabaseClient.from('personalizados').select('*');
        allOrdersData = orders || [];

        const { data: stock } = await supabaseClient.from('estoque').select('*');
        inventory = stock || [];

        if (currentUserRole === 'admin') {
            updateStoreFilter(allOrdersData);
            updateDashboard(allOrdersData);
        }

        renderStock(inventory);

    } catch (err) {
        console.error("Erro ao carregar dados:", err.message);
    }
}

// --- DASHBOARD E GRÁFICOS (UNIFICADO) ---
function updateDashboard(data) {
    const safeData = data || [];

    // Stats
    const total = document.getElementById('stat-total');
    const pendente = document.getElementById('stat-pendente');

    if (total) total.innerText = safeData.length;
    if (pendente) pendente.innerText = safeData.filter(o => (o.status_pedido || '').toLowerCase() === 'pendente').length;

    // Gráficos
    const statusCounts = {
        'Pendente': safeData.filter(o => o.status_pedido === 'Pendente').length,
        'Produção': safeData.filter(o => o.status_pedido === 'Produção').length,
        'Enviado': safeData.filter(o => o.status_pedido === 'Enviado').length
    };

    const storeCounts = {};
    safeData.forEach(o => {
        if (o.loja) storeCounts[o.loja] = (storeCounts[o.loja] || 0) + 1;
    });

    renderCharts(statusCounts, storeCounts);
    renderOrders(safeData);
}

function renderCharts(statusData, storeData) {
    if (statusChart) statusChart.destroy();
    if (storeChart) storeChart.destroy();

    const ctx1 = document.getElementById('statusChart');
    const ctx2 = document.getElementById('storeChart');

    if (ctx1 && ctx2) {
        statusChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{ data: Object.values(statusData), backgroundColor: ['#dc3545', '#FFD700', '#28a745'] }]
            }
        });

        storeChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: Object.keys(storeData),
                datasets: [{ label: 'Pedidos', data: Object.values(storeData), backgroundColor: '#D4AF37' }]
            },
            options: { indexAxis: 'y' }
        });
    }
}

// --- RENDERIZAR ESTOQUE (CATÁLOGO) ---
function renderStock(items) {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;

    catalog.innerHTML = items.map(item => {
        const imgUrl = convertDriveLink(item.imagem_url) || 'https://placehold.jp/24/d3bca5/ffffff/200x200.png?text=Sem+Foto';

        const banhoLower = (item.banho || "").toLowerCase();
        let banhoStyle = "background: #e5e5e5; color: #333;";
        if (banhoLower.includes("ouro")) banhoStyle = "background: #FFD700; color: #000; font-weight: bold;";
        else if (banhoLower.includes("prata")) banhoStyle = "background: #E8E8E8; color: #555; font-weight: bold;";

        return `
        <div class="card clickable" onclick="openOrderModal('${item.codigo}', '${item.nome}', '${item.banho}')">
            <div class="card-img-wrapper" style="position: relative; height: 220px; overflow: hidden;">
                <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.jp/200x200?text=Erro+na+Imagem'">
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem;">
                    Qtd: ${item.quantidade}
                </div>
                <div style="position: absolute; bottom: 10px; right: 10px; ${banhoStyle} padding: 4px 12px; border-radius: 50px; font-size: 0.7rem; text-transform: uppercase;">
                    ${item.banho}
                </div>
            </div>
            <div class="card-content" style="padding: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #999;">REF: ${item.codigo}</div>
                <div style="font-weight: bold;">${item.nome}</div>
            </div>
        </div>`;
    }).join('');
}

// --- RENDERIZAR PEDIDOS (LISTA ADMIN) ---
function renderOrders(items) {
    const container = document.getElementById('ordersList');
    if (!container) return;

    container.innerHTML = items.map(item => `
        <div class="card" style="border-left: 5px solid ${getStatusColor(item.status_pedido)}; margin-bottom: 10px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                <span>${item.data_pedido || 'Sem data'}</span>
                <strong>${item.loja || 'Loja não inf.'}</strong>
            </div>
            <div style="font-weight: bold; margin-bottom: 5px;">${item.cliente}</div>
            <div style="font-size: 0.9rem; color: #444; margin-bottom: 10px;">${item.produto}</div>
            <select onchange="updateStatus('${item.id}', this.value)" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                <option value="Pendente" ${item.status_pedido === 'Pendente' ? 'selected' : ''}>Pendente</option>
                <option value="Produção" ${item.status_pedido === 'Produção' ? 'selected' : ''}>Produção</option>
                <option value="Enviado" ${item.status_pedido === 'Enviado' ? 'selected' : ''}>Enviado</option>
            </select>
        </div>
    `).join('');
}

// --- FILTROS ADMIN ---
function updateStoreFilter(orders) {
    const select = document.getElementById('filterStore');
    if (!select) return;
    const stores = [...new Set(orders.map(o => o.loja))].filter(Boolean);
    select.innerHTML = '<option value="all">Todas as Lojas</option>';
    stores.forEach(store => {
        select.innerHTML += `<option value="${store}">${store}</option>`;
    });
}

function applyFilters() {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    const store = document.getElementById('filterStore').value;

    let filtered = [...allOrdersData];
    if (start) filtered = filtered.filter(o => o.data_pedido >= start);
    if (end) filtered = filtered.filter(o => o.data_pedido <= end);
    if (store !== 'all') filtered = filtered.filter(o => o.loja === store);

    updateDashboard(filtered);
}

// --- AUXILIARES E MODAL ---
function getStatusColor(status) {
    if (status === 'Pendente') return '#ffd700';
    if (status === 'Produção') return '#ff8c00';
    if (status === 'Enviado') return '#4caf50';
    return '#ddd';
}

window.updateStatus = async (id, newStatus) => {
    const { error } = await supabaseClient.from('personalizados').update({ status_pedido: newStatus }).eq('id', id);
    if (!error) loadAllData();
};

window.openOrderModal = (codigo, nome, banho) => {
    // Exibe um alerta simples e moderno
    alert(`Lançamento de Pedidos (Em Breve)\n\nO item ${nome} está disponível para consulta, mas o lançamento automático via sistema será liberado na próxima atualização.`);

    // Opcional: Se quiser que o modal nem tente abrir, basta deixar só o alerta.
    // O formulário de cadastro de pedidos fica assim inativo por enquanto.
};

window.closeModal = () => document.getElementById('orderModal').style.display = 'none';
window.logout = () => location.reload();

// Busca no catálogo
setTimeout(() => {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = inventory.filter(item =>
                String(item.nome || "").toLowerCase().includes(term) ||
                String(item.codigo || "").toLowerCase().includes(term)
            );
            renderStock(filtered);
        });
    }
}, 1000);

let currentTab = 0; // 0 = Admin, 1 = Catálogo

function initSwipe() {
    if (currentUserRole !== 'admin') return; // Vendedor não desliza, fica só no catálogo

    const element = document.getElementById('swipeWrapper');
    const hammer = new Hammer(element);

    // Detecta deslizar para a esquerda (vai para o catálogo)
    hammer.on('swipeleft', () => {
        if (currentTab === 0) {
            switchTab(1);
        }
    });

    // Detecta deslizar para a direita (volta para o admin)
    hammer.on('swiperight', () => {
        if (currentTab === 1) {
            switchTab(0);
        }
    });
}

function switchTab(index) {
    const wrapper = document.getElementById('swipeWrapper');
    if (!wrapper) return;

    // index 0 = 0%, index 1 = -50%
    const offset = index * -50;
    wrapper.style.transform = `translateX(${offset}%)`;
    currentTab = index;

    window.scrollTo(0, 0); // Volta pro topo ao trocar de aba
}

// Chame initSwipe() dentro do seu loadAllData() após verificar que é admin