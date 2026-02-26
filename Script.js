// 1. Configurações
const SUPABASE_URL = 'https://injsohwfskwhkayeywed.supabase.co';
const SUPABASE_KEY = 'sb_publishable_j4BOfsBLWhDw9kJrpByL6w_U607v2AD';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserRole = '';
let currentUserLogin = '';
let allOrdersData = [];
let inventory = [];
let statusChart, storeChart;

// --- AUXILIARES ---
function convertDriveLink(url) {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        const parts = url.match(/\/file\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
        if (parts && parts[1]) return `https://lh3.googleusercontent.com/u/0/d/${parts[1]}`;
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

        currentUserLogin = data.login;
        currentUserRole = String(data.nivel || 'vendedor').toLowerCase().trim();
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

    if (currentUserRole === 'admin') {
        swipeWrapper.style.display = 'flex';
        swipeWrapper.style.width = '200%';
        adminPanel.style.display = 'block';
        adminPanel.style.width = '50%';
        catalogPanel.style.display = 'block';
        catalogPanel.style.width = '50%';
        initSwipe();
        switchTab(0);
    } else {
        swipeWrapper.style.display = 'block';
        swipeWrapper.style.width = '100%';
        adminPanel.style.display = 'none';
        catalogPanel.style.display = 'block';
        catalogPanel.style.width = '100%';
    }

    try {
        // Busca os pedidos
        const { data: orders, error } = await supabaseClient
            .from('personalizados')
            .select('*')
            .order('data_pedido', { ascending: false });

        if (error) throw error;

        allOrdersData = orders || [];

        // BUSCA O ESTOQUE
        const { data: stock } = await supabaseClient.from('estoque').select('*');
        inventory = stock || [];

        // SE FOR ADMIN, ATUALIZA O DASHBOARD E A LISTA DE PEDIDOS IMEDIATAMENTE
        if (currentUserRole === 'admin') {
            updateDashboard(allOrdersData); // Aqui o renderOrders(data) é chamado dentro do dashboard
            updateStoreFilter(allOrdersData);
        }

        renderStock(inventory);

    } catch (err) {
        console.error("Erro ao carregar dados:", err.message);
    }
}

// --- DASHBOARD ---

function renderStatusChart(stats) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    // Se já existir um gráfico, destrói para não sobrepor
    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(stats),
            datasets: [{
                data: Object.values(stats),
                backgroundColor: [
                    '#D4AF37', // EM ABERTO (Dourado)
                    '#007bff', // PRODUZINDO (Azul)
                    '#28a745', // FEITO (Verde)
                    '#6c757d'  // ENTREGUE (Cinza)
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}
// --- Sincronização do Gráfico ---
// Variáveis para não duplicar os gráficos ao filtrar
let statusChartInstance = null;
let storeChartInstance = null;

function updateDashboard(data) {
    if (!data) return;

    // --- 1. ATUALIZAR NÚMEROS (CARDS SUPERIORES) ---
    const totalPedidos = data.length;
    const aguardandoProducao = data.filter(o => o.status_pedido === 'EM ABERTO').length;

    document.getElementById('stat-total').innerText = totalPedidos;
    document.getElementById('stat-pendente').innerText = aguardandoProducao;

    // --- 2. PREPARAR DADOS PARA O GRÁFICO DE STATUS ---
    const stats = {
        'EM ABERTO': data.filter(o => o.status_pedido === 'EM ABERTO').length,
        'PRODUZINDO': data.filter(o => o.status_pedido === 'PRODUZINDO').length,
        'FEITO': data.filter(o => o.status_pedido === 'FEITO').length,
        'ENTREGUE': data.filter(o => o.status_pedido === 'ENTREGUE').length
    };
    renderStatusChart(stats);

    // --- 3. PREPARAR DADOS PARA O GRÁFICO DE LOJAS ---
    renderStoreChart(data);

    // --- 4. RENDERIZAR A LISTA DE CARDS ---
    renderOrders(data);
}

// --- FUNÇÃO: GRÁFICO DE STATUS (Doughnut) ---
function renderStatusChart(stats) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(stats),
            datasets: [{
                data: Object.values(stats),
                backgroundColor: ['#D4AF37', '#007bff', '#28a745', '#6c757d'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// --- FUNÇÃO: GRÁFICO DE LOJAS (Barras Horizontais) ---
function renderStoreChart(data) {
    const ctx = document.getElementById('storeChart');
    if (!ctx) return;
    if (storeChartInstance) storeChartInstance.destroy();

    const storeCounts = {};
    data.forEach(order => {
        // CORREÇÃO: Usando order.loja que é o nome real da sua coluna
        const nomeLoja = order.loja || 'Não Informada';
        storeCounts[nomeLoja] = (storeCounts[nomeLoja] || 0) + 1;
    });

    storeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(storeCounts),
            datasets: [{
                label: 'Qtd Pedidos',
                data: Object.values(storeCounts),
                backgroundColor: '#b9925b',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

// --- Busca de Produto pelo Código ---
async function fetchProductDetails(codigo) {
    if (!codigo) return;

    // Busca na tabela estoque
    const { data, error } = await supabaseClient
        .from('estoque')
        .select('nome')
        .eq('codigo', codigo.toUpperCase())
        .single();

    if (data) {
        document.getElementById('edit_produto').value = data.nome;
    } else {
        document.getElementById('edit_produto').value = "Peça não encontrada no estoque";
    }
}

// --- Abrir Modal para Criar ou Editar ---
function openOrderEditor(order = null) {
    const modal = document.getElementById('orderEditorModal');
    modal.style.display = 'flex';

    if (order) {
        document.getElementById('editorTitle').innerText = "Editar Pedido";
        document.getElementById('edit_id').value = order.id;
        document.getElementById('edit_codigo').value = order.codigo || "";
        document.getElementById('edit_produto').value = order.produto || "";
        document.getElementById('edit_quantidade').value = order.quantidade || 1;
        document.getElementById('edit_banho').value = order.banho || "OURO";
        document.getElementById('edit_cliente').value = order.cliente || "";
        document.getElementById('edit_loja').value = order.loja || "";
        document.getElementById('edit_status').value = order.status_pedido || "EM ABERTO";
        document.getElementById('edit_observacao').value = order.observacao_pedido || "";

        // --- CORREÇÃO DA DATA AO ABRIR ---
        if (order.data_pedido) {
            // Garante o formato YYYY-MM-DD para o input date
            const dataISO = order.data_pedido.split('T')[0];
            document.getElementById('edit_data_pedido').value = dataISO;
        } else {
            document.getElementById('edit_data_pedido').value = "";
        }

        document.getElementById('btnDeleteOrder').style.display = 'block';
    } else {
        // Modo Novo Pedido
        // ... (limpar campos)
        document.getElementById('edit_data_pedido').value = new Date().toISOString().split('T')[0];
    }
}

// --- Salvar (Insert ou Update) ---
async function saveOrder() {
    // 1. Coleta dos elementos do DOM
    const id = document.getElementById('edit_id').value;
    const status = document.getElementById('edit_status').value;
    const codigoInput = document.getElementById('edit_codigo').value;
    const produtoInput = document.getElementById('edit_produto').value;
    const qtdInput = document.getElementById('edit_quantidade').value;
    const banhoInput = document.getElementById('edit_banho').value;
    const clienteInput = document.getElementById('edit_cliente').value;
    const lojaInput = document.getElementById('edit_loja').value;
    let dataPedInput = document.getElementById('edit_data_pedido').value;
    const obsInput = document.getElementById('edit_observacao').value;

    // 2. Montagem do Payload EXATAMENTE como as colunas do seu banco
    const payload = {
        codigo: codigoInput.toUpperCase(),
        tipo: 'SAIDA',
        quantidade: parseInt(qtdInput) || 1,
        produto: produtoInput,
        banho: banhoInput,
        foto_url: null, // Conforme sua especificação
        cliente: clienteInput,
        loja: lojaInput,
        observacao_pedido: obsInput,
        status_pedido: status,
        data_pedido: dataPedInput // Agora ele vai como YYYY-MM-DD ou null
    };

    if (!dataPedInput || dataPedInput === "") {
        dataPedInput = null; // Ou use new Date().toISOString().split('T')[0] se quiser forçar uma data
    }

    // 3. Lógica para data_envio (Apenas quando muda para ENTREGUE)
    if (status === 'ENTREGUE') {
        // Salva a data e hora do momento da entrega
        payload.data_envio = new Date().toISOString();
    }

    try {
        let error;

        if (id) {
            // --- ATUALIZAÇÃO (PATCH) ---
            const { error: patchError } = await supabaseClient
                .from('personalizados')
                .update(payload)
                .eq('id', parseInt(id)); // Garante que o ID é um número
            error = patchError;
        } else {
            // --- INSERÇÃO (POST) ---
            const { error: insertError } = await supabaseClient
                .from('personalizados')
                .insert([payload]);
            error = insertError;
        }

        if (error) throw error;

        alert("✅ Pedido processado com sucesso!");
        closeOrderEditor(); // Fecha o modal

        // Recarrega os dados para atualizar os gráficos e a lista
        if (typeof loadAllData === "function") {
            await loadAllData();
        }

    } catch (err) {
        console.error("Erro Supabase:", err);
        alert("❌ Erro ao salvar: " + (err.message || "Verifique o console"));
    }
}
// --- Apagar Pedido ---
async function deleteOrder() {
    const id = document.getElementById('edit_id').value;
    if (!id) return;

    if (confirm("⚠️ Tem certeza que deseja APAGAR este pedido definitivamente?")) {
        try {
            const { error } = await supabaseClient
                .from('personalizados')
                .delete()
                .eq('id', parseInt(id));

            if (error) throw error;

            alert("🗑️ Pedido removido!");
            closeOrderEditor();
            loadAllData(); // Recarrega a tela
        } catch (err) {
            alert("Erro ao excluir: " + err.message);
        }
    }
}

function closeOrderEditor() {
    document.getElementById('orderEditorModal').style.display = 'none';
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
                datasets: [{ data: Object.values(statusData), backgroundColor: ['#ffc107', '#007bff', '#28a745'] }]
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

// --- RENDERIZAR CATALOGO ---
function renderStock(items) {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;

    catalog.innerHTML = items.map(item => {
        const imgUrl = convertDriveLink(item.imagem_url) || 'https://placehold.jp/200x200.png';

        // CORREÇÃO: Chama openExpandedModal com os parâmetros certos
        return `
        <div class="card clickable" onclick="openExpandedModal('${item.codigo}', '${item.nome}', '${item.banho}', '${imgUrl}')">
            <div class="card-img-wrapper">
                <img src="${imgUrl}" loading="lazy">
                <div class="badge-banho">${item.banho || '---'}</div>
            </div>
            <div class="card-content">
                <div class="card-ref">REF: ${item.codigo}</div>
                <div class="card-name">${item.nome}</div>
            </div>
        </div>`;
    }).join('');
}

function renderOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    if (orders.length === 0) {
        ordersList.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">Nenhum pedido encontrado.</p>';
        return;
    }

    ordersList.innerHTML = orders.map(order => {
        const status = (order.status_pedido || "EM ABERTO").toUpperCase();

        // --- TRATAMENTO SEGURO DA DATA ---
        let dataFmt = "---";
        if (order.data_pedido) {
            const partes = order.data_pedido.split('T')[0].split('-');
            if (partes.length === 3) {
                dataFmt = `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
        }

        // Configuração de cores baseada no status
        let statusConfig = { class: "status-open", color: "#c6c6c6" };
        if (status === 'EM PRODUÇÃO' || status === 'PRODUZINDO') statusConfig = { class: "status-process", color: "#da9800" };
        else if (status === 'CONCLUÍDO' || status === 'FEITO') statusConfig = { class: "status-done", color: "#28a745" };
        else if (status === 'CANCELADO') statusConfig = { class: "status-cancel", color: "#dc3545" };
        else if (status === 'ENTREGUE') statusConfig = { class: "status-delivered", color: "#000000" };

        return `
        <div class="order-card" onclick="prepareAndOpenEditor('${order.id}')" style="border-left: 5px solid ${statusConfig.color}; cursor: pointer;">
            <div class="order-header">
                <div class="order-main-info">
                    <span class="order-client-name">${order.cliente || 'Cliente não informado'}</span>
                    <span class="order-date">📅 ${dataFmt}</span>
                    <span class="order-loja">🏬 ${order.loja || 'Geral'}</span>
                </div>
                <span class="status-badge-dynamic ${statusConfig.class}">${status}</span>
            </div>

            <div class="order-details-summary" style="margin-top: 10px; font-size: 0.9rem; color: #555;">
                <strong>${order.produto || '---'}</strong> - ${order.quantidade || 1} un.
                <p style="font-size: 0.75rem; color: #888; margin-top: 5px;">Clique para editar ou ver detalhes</p>
            </div>
        </div>`;
    }).join('');
}

function openExpandedModal(codigo, nome, banho, imgUrl) {
    const modal = document.getElementById('expandedCardModal');
    if (!modal) return;

    // Preenche os dados básicos da peça
    document.getElementById('exp_img').src = imgUrl;
    document.getElementById('exp_nome').innerText = nome;
    document.getElementById('exp_codigo').innerText = codigo;
    document.getElementById('exp_banho').innerText = banho;

    // Reseta o formulário de pedido para o estado inicial
    document.getElementById('orderFields').style.display = 'none';
    document.getElementById('btnInitialOrder').style.display = 'block';

    // Limpa campos de texto
    document.getElementById('m_cliente_nome').value = "";
    document.getElementById('m_observacoes').value = "";

    modal.style.display = 'flex';
}

function showOrderStep2() {
    document.getElementById('orderFields').style.display = 'block';
    document.getElementById('btnInitialOrder').style.display = 'none';
}

// FUNÇÃO DE APOIO: Localiza o pedido e abre o modal sem erros de texto
function prepareAndOpenEditor(orderId) {
    const order = allOrdersData.find(o => String(o.id) === String(orderId));
    if (order) {
        openOrderEditor(order);
    } else {
        console.error("Pedido não encontrado na lista local:", orderId);
    }
}

// Função para expandir/recolher o card
function toggleOrderCard(element) {
    // Fecha outros cards abertos (opcional, para um visual mais limpo)
    document.querySelectorAll('.order-card.active').forEach(card => {
        if (card !== element) card.classList.remove('active');
    });

    // Alterna o card atual
    element.classList.toggle('active');
}

// --- FUNÇÕES DE STATUS ---
async function changeStatusAction(orderId, statusAtual) {
    const opcao = prompt(`Status Atual: ${statusAtual}\n\nEscolha o novo status:\n1 - EM ABERTO\n2 - EM PRODUÇÃO\n3 - CONCLUÍDO\n4 - CANCELADO`);
    if (!opcao) return;

    let novoStatus = "";
    if (opcao === "1") novoStatus = "EM ABERTO";
    else if (opcao === "2") novoStatus = "EM PRODUÇÃO";
    else if (opcao === "3") novoStatus = "CONCLUÍDO";
    else if (opcao === "4") novoStatus = "CANCELADO";
    else { alert("Opção inválida"); return; }

    try {
        const { error } = await supabaseClient.from('personalizados').update({ status_pedido: novoStatus }).eq('id', orderId);
        if (error) throw error;
        alert("Status atualizado!");
        await loadAllData();
    } catch (err) { alert("Erro: " + err.message); }
}

// --- LANÇAR PEDIDO ---
async function processOrder() {
    // 1. Captura os dados do formulário do catálogo
    const cliente = document.getElementById('m_cliente_nome').value.trim();
    const observacaoOriginal = document.getElementById('m_observacoes').value.trim();
    const tipoGravacao = document.getElementById('m_gravacao').value;

    // Dados da peça que estão nos textos do modal
    const produto = document.getElementById('exp_nome').innerText;
    const codigo = document.getElementById('exp_codigo').innerText;
    const banho = document.getElementById('exp_banho').innerText;

    // 2. Validação simples
    if (!cliente) {
        alert("Por favor, digite o nome do cliente.");
        return;
    }

    // Monta a observação combinando o tipo de gravação + observação
    const observacaoFinal = `[${tipoGravacao}] ${observacaoOriginal}`;

    // 3. Monta o payload para o Supabase
    const payload = {
        codigo: codigo,
        produto: produto,
        quantidade: 1,
        banho: banho,
        cliente: cliente,
        // Aqui usamos a lógica de detectar a loja do usuário logado ou pedir seleção
        // Por enquanto, vamos usar uma loja padrão ou pegar do sistema de login
        loja: window.userLoja || "MADEAN JOIAS QUIXADA",
        status_pedido: 'EM ABERTO',
        tipo: 'SAIDA',
        observacao_pedido: observacaoFinal,
        data_pedido: new Date().toISOString().split('T')[0]
    };

    try {
        const { error } = await supabaseClient
            .from('personalizados')
            .insert([payload]);

        if (error) throw error;

        alert("✅ Pedido enviado com sucesso!");
        closeExpandedModal();

        // Se estiver no Admin, recarrega a lista
        if (typeof loadAllData === "function") loadAllData();

    } catch (err) {
        console.error("Erro ao lançar pedido:", err);
        alert("Erro ao salvar pedido: " + err.message);
    }
}

// --- INTERFACE ---
// Variáveis globais para armazenar a peça selecionada no catálogo
let pecaSelecionada = {
    codigo: '',
    produto: '',
    banho: ''
};

// Função que abre o modal quando clica na peça do catálogo

function openOrderModal(codigo, nome, banho) {
    // 1. Guarda os dados da peça clicada
    pecaSelecionada.codigo = codigo;
    pecaSelecionada.produto = nome;
    pecaSelecionada.banho = banho;

    // 2. Localiza o modal de pedido (o modal do vendedor)
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'flex';

        // 3. Preenche o título do modal com o nome da peça para o vendedor ver
        const titulo = modal.querySelector('h2');
        if (titulo) titulo.innerText = `Pedir: ${nome}`;
    } else {
        console.error("Modal 'orderModal' não encontrado no HTML");
    }
}

function showOrderStep2() {
    document.getElementById('orderFields').style.display = 'flex';
    document.getElementById('btnInitialOrder').style.display = 'none';
}

function closeExpandedModal() { document.getElementById('expandedCardModal').style.display = 'none'; }
function logout() { location.reload(); }

// --- SWIPE ---
function initSwipe() {
    const element = document.getElementById('swipeWrapper');
    const hammer = new Hammer(element);
    hammer.on('swipeleft', () => { if (currentTab === 0) switchTab(1); });
    hammer.on('swiperight', () => { if (currentTab === 1) switchTab(0); });
}

function switchTab(index) {
    const wrapper = document.getElementById('swipeWrapper');
    const panels = document.querySelectorAll('.tab-panel');

    wrapper.style.transform = `translateX(${index * -50}%)`;
    currentTab = index;

    // Opcional: Esconde a visibilidade da aba que não está em foco após a animação
    panels.forEach((panel, i) => {
        panel.style.visibility = (i === index) ? 'visible' : 'hidden';
    });

    window.scrollTo(0, 0);
}

function updateStoreFilter(orders) {
    const select = document.getElementById('filterStore');
    const stores = [...new Set(orders.map(o => o.loja_vendedor))].filter(Boolean);
    select.innerHTML = '<option value="all">Todas as Lojas</option>';
    stores.forEach(s => select.innerHTML += `<option value="${s}">${s}</option>`);
}

function applyFilters() {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    const store = document.getElementById('filterStore').value;

    let filtered = [...allOrdersData];

    if (start) filtered = filtered.filter(o => o.data_pedido >= start);
    if (end) filtered = filtered.filter(o => o.data_pedido <= end);
    if (store !== 'all') filtered = filtered.filter(o => o.loja_vendedor === store);

    // Atualiza a tela com os resultados filtrados
    updateDashboard(filtered);
}
function filterByText(termo) {
    if (!allOrdersData) return;

    const busca = termo.toLowerCase().trim();

    const filtrados = allOrdersData.filter(o => {
        // Transformamos os campos em String e tratamos nulos (usando "" como padrão)
        const cliente = String(o.cliente || "").toLowerCase();
        const codigo = String(o.codigo || "").toLowerCase();
        const produto = String(o.produto || "").toLowerCase();

        // Verifica se o termo de busca está em algum desses campos
        return cliente.includes(busca) ||
            codigo.includes(busca) ||
            produto.includes(busca);
    });

    // Atualiza os gráficos e a lista com o que foi encontrado
    updateDashboard(filtrados);
}