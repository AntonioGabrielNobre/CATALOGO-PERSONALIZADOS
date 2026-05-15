// 1. Configurações
const SUPABASE_URL = 'https://injsohwfskwhkayeywed.supabase.co';
const SUPABASE_KEY = 'sb_publishable_j4BOfsBLWhDw9kJrpByL6w_U607v2AD';
let allOrders = []; // Isso cria o "balde" vazio que vai segurar os pedidos
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let windowUserLoja = "";

// Adicione o parâmetro 'event' na definição da função
// --- FUNÇÕES GLOBAIS DO MODAL DE LINK ---

window.openModalGerarLink = function () {
    console.log("Abrindo modal...");
    const modal = document.getElementById('modalGerarLink');
    if (!modal) {
        console.error("Erro: Elemento modalGerarLink não encontrado no HTML");
        return;
    }

    modal.style.display = 'block';

    // Limpa filtros
    if (document.getElementById('linkFilterDataInicio')) document.getElementById('linkFilterDataInicio').value = "";
    if (document.getElementById('linkFilterDataFim')) document.getElementById('linkFilterDataFim').value = "";

    // Preenche as lojas
    const selectLoja = document.getElementById('linkFilterLoja');
    if (selectLoja && typeof allOrdersData !== 'undefined') {
        const lojasUnicas = [...new Set(allOrdersData.map(o => o.loja).filter(l => l))];
        selectLoja.innerHTML = '<option value="">Todas as Lojas</option>' +
            lojasUnicas.sort().map(l => `<option value="${l}">${l}</option>`).join('');
    }

    renderListaSelecao();
};

window.fecharModalLink = function () {
    const modal = document.getElementById('modalGerarLink');
    if (modal) modal.style.display = 'none';
};

window.renderListaSelecao = function () {
    const container = document.getElementById('listaPedidosSelecao');
    if (!container || typeof allOrdersData === 'undefined') return;

    const filtroLoja = document.getElementById('linkFilterLoja').value;
    const dataInicio = document.getElementById('linkFilterDataInicio').value;
    const dataFim = document.getElementById('linkFilterDataFim').value;

    let filtrados = allOrdersData.filter(o => {
        const bateLoja = !filtroLoja || o.loja === filtroLoja;
        let batePeriodo = true;
        if (o.data_pedido) {
            const dataPedido = o.data_pedido.split('T')[0];
            if (dataInicio && dataPedido < dataInicio) batePeriodo = false;
            if (dataFim && dataPedido > dataFim) batePeriodo = false;
        }
        return bateLoja && batePeriodo;
    });

    if (filtrados.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">Nenhum pedido encontrado.</p>';
        return;
    }

    container.innerHTML = filtrados.map(o => `
        <label style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid #eee; cursor:pointer;">
            <input type="checkbox" class="link-checkbox" value="${o.id}" style="width:18px; height:18px;">
            <div style="flex:1;">
                <div style="font-weight:bold; font-size:0.9rem;">${o.cliente || 'Sem Nome'}</div>
                <div style="font-size:0.75rem; color:#666;">${o.produto} | ${o.loja || 'Geral'}</div>
            </div>
        </label>
    `).join('');
};

window.executarGerarLink = async function (event) {
    if (event) event.preventDefault();

    const checkboxes = document.querySelectorAll('.link-checkbox:checked');
    const idsSelecionados = Array.from(checkboxes).map(cb => cb.value);

    if (idsSelecionados.length === 0) {
        alert("⚠️ Selecione pelo menos um pedido!");
        return;
    }

    const idsString = idsSelecionados.join(',');
    const hash = btoa(idsString);

    // DEFINIÇÃO DO LINK DA VERCEL
    const baseUrl = "https://catalogopersonalizadosmadeanjoias.vercel.app";
    const urlAprovacao = `${baseUrl}/aprovacao.html?p=${hash}`;

    console.log("Link gerado para Vercel:", urlAprovacao);

    try {
        await navigator.clipboard.writeText(urlAprovacao);

        const btn = event.target;
        const textoOriginal = btn.innerText;
        btn.innerText = "✅ LINK COPIADO!";
        btn.style.backgroundColor = "#128C7E";

        setTimeout(() => {
            btn.innerText = textoOriginal;
            btn.style.backgroundColor = "#25D366";
            fecharModalLink();
        }, 2000);

    } catch (err) {
        // Fallback caso a cópia automática falhe
        prompt("Copie o link de aprovação abaixo:", urlAprovacao);
        fecharModalLink();
    }
};

function renderListaSelecao() {
    console.log("Tentando renderizar. Total de pedidos no banco:", allOrdersData.length);

    const container = document.getElementById('listaPedidosSelecao');
    if (!container) return;

    const filtroLoja = document.getElementById('linkFilterLoja').value;
    const dataInicio = document.getElementById('linkFilterDataInicio').value;
    const dataFim = document.getElementById('linkFilterDataFim').value;

    let filtrados = allOrdersData.filter(o => {
        // Filtro de Loja
        const bateLoja = !filtroLoja || o.loja === filtroLoja;

        // Filtro de Período (Só filtra se o usuário preencher a data)
        let batePeriodo = true;
        if (o.data_pedido) {
            const dataPedido = o.data_pedido.split('T')[0];

            if (dataInicio && dataPedido < dataInicio) batePeriodo = false;
            if (dataFim && dataPedido > dataFim) batePeriodo = false;
        }

        return bateLoja && batePeriodo;
    });

    if (filtrados.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:0.8rem; padding:20px;">Nenhum pedido encontrado.</p>';
        return;
    }

    container.innerHTML = filtrados.map(o => `
            <label style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid #eee; cursor:pointer;">
                <input type="checkbox" class="link-checkbox" value="${o.id}" style="width:18px; height:18px;">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:0.9rem;">${o.cliente || 'Sem Nome'}</div>
                    <div style="font-size:0.75rem; color:#666;">Ref: ${o.codigo || '---'} | ${o.produto}</div>
                </div>
            </label>
        `).join('');
}

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
    const userSelect = document.getElementById('userLogin').value;
    const pass = document.getElementById('userPass').value.trim();

    if (!userSelect) {
        alert("Por favor, selecione uma loja.");
        return;
    }

    try {
        // 1. Busca no banco usando o login em minúsculo (como está no seu banco)
        const { data, error } = await supabaseClient
            .from('logins')
            .select('*')
            .eq('login', userSelect)
            .eq('senha', pass)
            .single();

        if (error || !data) {
            alert("Senha incorreta para a loja selecionada!");
            return;
        }

        // 2. Mapeamento para o Nome Oficial (usado nos Pedidos e Filtros)
        const lojasMap = {
            'quixada': 'MADEAN JOIAS QUIXADA',
            'fortaleza': 'MADEAN JOIAS FORTALEZA',
            'iguatu': 'MADEAN JOIAS IGUATU 1',
            'maranguape': 'MADEAN JOIAS MARANGUAPE',
            'limoeiro': 'MADEAN JOIAS LIMOEIRO',
            'GABRIEL': 'GABRIEL'
        };

        // 3. Define as variáveis globais de sessão
        currentUserLogin = data.login;
        currentUserRole = String(data.nivel || 'vendedor').toLowerCase().trim();

        // Define a loja oficial baseada no mapeamento ou no que vem do banco
        const nomeOficial = lojasMap[userSelect] || data.loja;
        window.userLoja = nomeOficial;
        localStorage.setItem('lojaLogada', nomeOficial);

        // 4. Interface e Troca de Tela
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';

        // Atualiza o texto do vendedor no modal de pedido, se existir
        const labelVendedor = document.getElementById('m_vendedor_auto');
        if (labelVendedor) labelVendedor.innerText = nomeOficial;

        // Mostrar botão manual apenas para admin
        const btnManual = document.getElementById('btnNovoManual');
        if (btnManual) {
            btnManual.style.display = (userSelect === 'admin') ? 'block' : 'none';
        }

        await loadAllData();

        // APENAS muda de aba, sem abrir modal
        if (currentUserRole === 'admin' || userSelect === 'GABRIEL') {
            switchTab(0);
        }
        if (userSelect === 'admin') switchTab(0);

    } catch (err) {
        console.error("Erro no login:", err.message);
        alert("Erro ao validar acesso.");
    }
}

// Função para abrir o modal de novo pedido manual
window.openOrderManual = function () {
    const modal = document.getElementById('orderEditorModal');

    if (modal) {
        // 1. Exibe o modal
        modal.style.setProperty('display', 'flex', 'important');

        // 2. Ajusta o título e garante que o botão de apagar esteja escondido (é um novo pedido)
        const titulo = document.getElementById('editorTitle');
        if (titulo) titulo.innerText = "Lançar Novo Pedido (Manual)";

        const btnDelete = document.getElementById('btnDeleteOrder');
        if (btnDelete) btnDelete.style.display = 'none';

        // 3. Limpa a lista de sugestões caso tenha ficado aberta
        const lista = document.getElementById('listaSugestoes');
        if (lista) {
            lista.innerHTML = '';
            lista.style.display = 'none';
        }

        // 4. Limpa TODOS os campos (incluindo os novos que adicionamos no HTML)
        const campos = [
            'edit_id',
            'edit_codigo',
            'edit_produto',
            'edit_banho',
            'edit_cliente',
            'edit_observacao',
            'url_foto_1',
            'url_foto_2'
        ];

        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

        // 5. Reseta campos com valores padrão
        if (document.getElementById('edit_quantidade')) document.getElementById('edit_quantidade').value = "1";
        if (document.getElementById('edit_status')) document.getElementById('edit_status').value = "EM ABERTO";
        if (document.getElementById('edit_loja')) document.getElementById('edit_loja').value = "MADEAN JOIAS QUIXADA";

        // 6. Reseta as prévias de fotos (se houver)
        ['prev_foto_1', 'prev_foto_2'].forEach(id => {
            const img = document.getElementById(id);
            if (img) {
                img.src = "";
                img.style.display = 'none';
            }
        });
        ['label_foto_1', 'label_foto_2'].forEach(id => {
            const label = document.getElementById(id);
            if (label) label.style.display = 'block';
        });

        // 7. Define a data de hoje como padrão
        const campoData = document.getElementById('edit_data_pedido');
        if (campoData) {
            campoData.value = new Date().toISOString().split('T')[0];
        }

        console.log("Formulário de novo pedido resetado e aberto.");
    } else {
        console.error("Erro: O elemento 'orderEditorModal' não foi encontrado.");
    }
};

// 1. Função que busca no estoque local enquanto você digita o código
function buscarProdutoManual(termo) {
    const lista = document.getElementById('listaSugestoes');
    const busca = termo.toLowerCase().trim();

    // Só começa a buscar após digitar 2 caracteres para não sobrecarregar
    if (busca.length < 2) {
        lista.style.display = 'none';
        return;
    }

    // Filtra dentro da variável 'inventory' (que o loadAllData já carregou do banco)
    // Procuramos por código ou por nome
    const sugestoes = inventory.filter(item =>
        String(item.codigo).toLowerCase().includes(busca) ||
        item.nome.toLowerCase().includes(busca)
    ).slice(0, 8); // Mostra no máximo 8 sugestões

    if (sugestoes.length > 0) {
        lista.style.display = 'block';
        lista.innerHTML = sugestoes.map(item => `
            <div onclick="selecionarProdutoManual('${item.codigo}', '${item.nome}', '${item.banho}')" 
                 style="padding: 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; font-size: 13px; transition: background 0.2s;"
                 onmouseover="this.style.background='#f9f9f9'" 
                 onmouseout="this.style.background='white'">
                <span style="font-weight: bold; color: #D4AF37;">${item.codigo}</span> - ${item.nome} 
                <small style="color: #888; margin-left: 5px;">(${item.banho})</small>
            </div>
        `).join('');
    } else {
        // Se não achar nada, avisa o usuário
        lista.style.display = 'block';
        lista.innerHTML = '<div style="padding: 10px; color: #999; font-size: 12px;">Nenhum produto encontrado...</div>';
    }
}

// 2. Função que é chamada ao clicar em uma sugestão da lista
function selecionarProdutoManual(codigo, nome, banho) {
    // Preenche os campos do modal com os dados da peça selecionada
    const campoCodigo = document.getElementById('edit_codigo');
    const campoProduto = document.getElementById('edit_produto');
    const campoBanho = document.getElementById('edit_banho');

    if (campoCodigo) campoCodigo.value = codigo;
    if (campoProduto) campoProduto.value = nome;
    if (campoBanho) campoBanho.value = banho;

    // Fecha a lista de sugestões
    const lista = document.getElementById('listaSugestoes');
    if (lista) {
        lista.innerHTML = '';
        lista.style.display = 'none';
    }

    console.log(`Produto selecionado: ${codigo} - ${nome}`);
}

// --- CARREGAR DADOS ---
async function loadAllData() {
    // 1. Referências com proteção
    const adminPanel = document.getElementById('adminPanel');
    const catalogPanel = document.getElementById('catalogPanel');
    const swipeWrapper = document.getElementById('swipeWrapper');

    // 2. Lógica de exibição por cargo (Role)
    if (currentUserRole === 'admin') {
        if (swipeWrapper) {
            swipeWrapper.style.display = 'flex';
            swipeWrapper.style.width = '200%';
        }
        if (adminPanel) {
            adminPanel.style.display = 'block';
            adminPanel.style.width = '50%';
        }
        if (catalogPanel) {
            catalogPanel.style.display = 'block';
            catalogPanel.style.width = '50%';
        }
        if (typeof initSwipe === "function") initSwipe();
        if (typeof switchTab === "function") switchTab(0);
    } else {
        if (swipeWrapper) {
            swipeWrapper.style.display = 'block';
            swipeWrapper.style.width = '100%';
        }
        if (adminPanel) adminPanel.style.display = 'none';
        if (catalogPanel) {
            catalogPanel.style.display = 'block';
            catalogPanel.style.width = '100%';
        }
    }

    try {
        console.log("Iniciando busca de dados...");

        // 3. Busca Pedidos (personalizados)
        const { data: orders, error: errorOrders } = await supabaseClient
            .from('personalizados')
            .select('*')
            .order('data_pedido', { ascending: false });

        if (errorOrders) throw errorOrders;

        // ATENÇÃO: Aqui alimentamos a variável global que o Modal usará
        allOrdersData = orders || [];

        // 4. Busca Estoque
        const { data: stock, error: errorStock } = await supabaseClient
            .from('estoque')
            .select('*')
            .order('id', { ascending: true })
            .order('banho', { ascending: true });

        if (errorStock) throw errorStock;
        inventory = stock || [];

        console.log("Total de itens no banco:", inventory.length);

        // 5. Renderização Condicional
        if (currentUserRole === 'admin') {
            // Renderiza a lista principal de pedidos no Admin
            if (typeof renderOrders === "function") {
                renderOrders(allOrdersData);
            }
            if (typeof updateDashboard === "function") updateDashboard(allOrdersData);
            if (typeof updateStoreFilter === "function") updateStoreFilter(allOrdersData);
        }

        if (typeof renderStock === "function") {
            renderStock(inventory);
        }

        console.log("Dados carregados com sucesso!");

    } catch (err) {
        console.error("Erro crítico ao carregar dados:", err.message);
        alert("Erro de conexão com o banco. Verifique o console.");
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
async function fetchProductDetails(codigoDigitado) {
    const cod = codigoDigitado.trim();
    if (!cod) return;

    try {
        // Buscamos no estoque ignorando maiúsculas/minúsculas se for texto
        const { data, error } = await supabaseClient
            .from('estoque')
            .select('*')
            .eq('codigo', cod)
            .limit(1)
            .single();

        if (error || !data) {
            console.error("Produto não encontrado:", cod);
            document.getElementById('edit_produto').value = "PRODUTO NÃO ENCONTRADO";
            return;
        }

        // Preenche os campos do modal
        document.getElementById('edit_produto').value = data.produto;
        document.getElementById('edit_banho').value = data.banho || "OURO";

        // Dica: Guarde a quantidade atual num atributo oculto para facilitar a baixa depois
        document.getElementById('edit_quantidade').setAttribute('data-max', data.quantidade);

        console.log("Produto carregado:", data.produto);

    } catch (err) {
        console.error("Erro ao buscar produto:", err);
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
        // Limpa fotos anteriores ao abrir
        document.getElementById('url_foto_1').value = order.foto_resultado_1 || "";
        document.getElementById('url_foto_2').value = order.foto_resultado_2 || "";

        // Lógica para mostrar as imagens se elas existirem
        for (let i = 1; i <= 2; i++) {
            const url = order[`foto_resultado_${i}`];
            const preview = document.getElementById(`prev_foto_${i}`);
            const label = document.getElementById(`label_foto_${i}`);
            if (url) {
                preview.src = url;
                preview.style.display = "block";
                label.style.display = "none";
            } else {
                preview.style.display = "none";
                label.style.display = "block";
                label.innerText = `📸 Foto ${i}`;
            }
        }

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
    const id = document.getElementById('edit_id').value;
    const status = document.getElementById('edit_status').value;
    const codigoInput = document.getElementById('edit_codigo').value;
    const produtoInput = document.getElementById('edit_produto').value;
    const qtdInput = document.getElementById('edit_quantidade').value;
    const banhoInput = document.getElementById('edit_banho').value;
    const clienteInput = document.getElementById('edit_cliente').value;
    const lojaInput = document.getElementById('edit_loja').value;
    let dataPedInput = document.getElementById('edit_data_pedido')?.value; // Adicionado o ? para não quebrar se não existir
    const obsInput = document.getElementById('edit_observacao').value;
    // 2. Coleta dos novos campos de foto
    const foto1 = document.getElementById('url_foto_1').value;
    const foto2 = document.getElementById('url_foto_2').value;

    // 3. Montagem do Payload CORRIGIDO
    const payload = {
        codigo: codigoInput.toUpperCase().trim(), // Voltamos para 'codigo' como está no seu banco
        tipo: 'SAIDA',
        quantidade: parseInt(qtdInput) || 1,
        produto: produtoInput,
        banho: banhoInput,
        cliente: clienteInput,
        loja: lojaInput,
        observacao_pedido: obsInput,
        status_pedido: status,
        data_pedido: dataPedInput || new Date().toISOString().split('T')[0],
        // Novos campos de fotos:
        foto_resultado_1: foto1,
        foto_resultado_2: foto2
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

// FUNÇÃO PARA FECHAR (O botão X)
function closeOrderEditor() {
    const modal = document.getElementById('orderEditorModal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
    }
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

    if (!items || items.length === 0) {
        catalog.innerHTML = "<p style='padding:20px;'>Nenhum item encontrado no estoque.</p>";
        return;
    }

    // Limpa o catálogo antes de renderizar
    catalog.innerHTML = "";

    const htmlCards = items.map(item => {
        try {
            // Se for a peça 8847, vamos forçar a visibilidade
            const isTarget = item.codigo == "8847";

            const cod = item.codigo || "S/REF";
            const nome = item.nome || "Produto sem nome";
            const banho = (item.banho || "---").toUpperCase().trim();
            const qtd = item.quantidade || 0;
            const idUnico = item.id; // Usando o ID da tabela do Supabase

            let imgUrl = 'https://placehold.jp/200x200.png';
            if (item.imagem_url) {
                imgUrl = typeof convertDriveLink === "function" ? convertDriveLink(item.imagem_url) : item.imagem_url;
            }

            const qtdCor = qtd <= 0 ? 'var(--danger)' : '#333';
            const qtdTexto = qtd > 0 ? `${qtd} un` : 'Esgotado';

            let bgCor = "#eee";
            if (banho === "OURO") {
                bgCor = "linear-gradient(135deg, #FFD700, #DAA520)";
            } else if (banho === "PRATA") {
                bgCor = "linear-gradient(135deg, #C0C0C0, #E8E8E8)";
            }

            // O segredo aqui é o data-id para não dar conflito no DOM
            return `
            <div class="card clickable" data-id="${idUnico}" onclick="openExpandedModal('${cod}', '${nome}', '${banho}', '${imgUrl}', '${qtd}')">
                <div class="card-img-wrapper">
                    <img src="${imgUrl}" loading="lazy" onerror="this.src='https://placehold.jp/200x200.png'">
                    <div class="badge-banho" style="background: ${bgCor}; color: ${banho === 'OURO' ? '#000' : '#333'}; font-weight: bold; position: absolute; top: 5px; right: 5px; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                        ${banho}
                    </div>
                </div>
                <div class="card-content">
                    <div class="card-ref" style="font-size: 10px; color: #888;">REF: ${cod}</div>
                    <div class="card-name" style="font-size: 12px; font-weight: bold; margin: 4px 0;">${nome}</div>
                    <div class="card-qty" style="background: ${bgCor}; color: ${qtdCor}; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-block;">
                        Estoque: ${qtdTexto}
                    </div>
                </div>
            </div>`;
        } catch (e) {
            console.error("Erro no map:", e);
            return "";
        }
    }).join('');

    catalog.innerHTML = htmlCards;
}
function renderOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    if (!orders || orders.length === 0) {
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
        // AQUI ESTÁ O SEGREDO: O objeto se chama statusConfig
        let statusConfig = { class: "status-open", color: "#c6c6c6" };
        if (status === 'EM PRODUÇÃO' || status === 'PRODUZINDO') statusConfig = { class: "status-process", color: "#da9800" };
        else if (status === 'CONCLUÍDO' || status === 'FEITO') statusConfig = { class: "status-done", color: "#28a745" };
        else if (status === 'CANCELADO') statusConfig = { class: "status-cancel", color: "#dc3545" };
        else if (status === 'ENTREGUE') statusConfig = { class: "status-delivered", color: "#000000" };

        const seloCard = order.aprovado_loja
            ? `<div style="color: #2e7d32; font-size: 0.65rem; font-weight: bold; margin-top: 5px; text-align: right;">✅ APROVADO PELA LOJA</div>`
            : '';

        const mensagemAprovacaoInterna = order.aprovado_loja
            ? `<div style="background: #e8f5e9; color: #1b5e20; padding: 10px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-align: center; border: 1px solid #c8e6c9; margin-bottom: 10px;">
                ✓ A loja já conferiu e aprovou este pedido.
               </div>`
            : '';

        return `
            <div class="order-card" id="card-${order.id}" 
                onclick="toggleCardExpansion('${order.id}', event)" 
                style="position: relative; overflow: hidden; border-left: 5px solid ${statusConfig.color}; background: white; border-radius: 8px; margin-bottom: 12px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); cursor: pointer;">
                        
            <div style="padding: 0;"> <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    
                    <div class="order-main-info" style="display: flex; flex-direction: column; gap: 4px;">
                        <span class="order-client-name" style="font-weight: 700; font-size: 1rem; color: #333;">
                            ${order.cliente || 'Cliente não informado'}
                        </span>
                        <div style="display: flex; gap: 10px; font-size: 0.8rem; color: #777;">
                            <span>📅 ${dataFmt}</span>
                            <span>🏬 ${order.loja || 'Geral'}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <span class="status-badge-dynamic ${statusConfig.class}" style="white-space: nowrap;">${status}</span>
                        ${seloCard}
                    </div>
                </div>
                
                <div style="margin-top: 12px; font-size: 0.9rem; color: #444;">
                    <strong>${order.produto || '---'}</strong> <span style="color: #888;">(${order.quantidade || 1} un.)</span>
                </div>
            </div>

            <div class="order-details-expanded" id="details-${order.id}" onclick="event.stopPropagation()" 
                 style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease; background: #fafafa;">
                
                <div style="padding: 20px; border-top: 1px solid #eee; display: flex; flex-direction: column; gap: 15px;">
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${order.foto_resultado_1 ? `<img src="${order.foto_resultado_1}" onclick="expandImage(this.src)" style="width: 110px; height: 110px; object-fit: cover; border-radius: 10px; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: zoom-in;">` : ''}
                        ${order.foto_resultado_2 ? `<img src="${order.foto_resultado_2}" onclick="expandImage(this.src)" style="width: 110px; height: 110px; object-fit: cover; border-radius: 10px; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: zoom-in;">` : ''}
                    </div>

                    <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #eee; font-size: 0.85rem; color: #555;">
                        <strong>📝 Observações:</strong> ${order.observacao_pedido || 'Nenhuma observação.'}
                    </div>

                    <div style="margin-top: 5px;">
                        ${mensagemAprovacaoInterna}
                        <button onclick="prepareAndOpenEditor('${order.id}')" 
                                style="width: 100%; padding: 14px; background: #1a1a1a; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">
                            ✏️ Editar este Pedido
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openExpandedModal(codigo, nome, banho, imgUrl, quantidade) {
    const modal = document.getElementById('expandedCardModal');
    if (!modal) return;

    // Preenche imagem e textos básicos
    document.getElementById('exp_img').src = imgUrl;
    document.getElementById('exp_codigo').innerText = codigo;
    document.getElementById('exp_banho').innerText = banho;

    // Mostra o nome e a quantidade disponível no título
    const statusEstoque = quantidade > 0 ? `(${quantidade} disponível)` : `(ESGOTADO)`;
    document.getElementById('exp_nome').innerHTML = `${nome} <br><small style="color: #666; font-size: 0.85rem;">${statusEstoque}</small>`;

    // Reseta o estado do formulário de pedido
    document.getElementById('orderFields').style.display = 'none';
    const btnPedido = document.getElementById('btnInitialOrder');

    if (btnPedido) {
        btnPedido.style.display = 'block';
        // Opcional: Desativa o botão se não houver estoque
        btnPedido.disabled = (quantidade <= 0);
        btnPedido.innerText = quantidade > 0 ? "Lançar Pedido" : "Produto Indisponível";
        btnPedido.style.opacity = quantidade > 0 ? "1" : "0.5";
    }

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
        // Mostra/Esconde o aviso de aprovação de forma segura
        const statusContainer = document.getElementById('status_aprovacao_container');
        if (statusContainer) {
            statusContainer.style.display = order.aprovado_loja ? 'block' : 'none';
        }
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

// --- LANÇAR PEDIDO COM BAIXA DE ESTOQUE ---
async function processOrder() {
    // 1. Captura os dados do formulário
    const cliente = document.getElementById('m_cliente_nome').value.trim();
    const observacaoOriginal = document.getElementById('m_observacoes').value.trim();
    const tipoGravacao = document.getElementById('m_gravacao').value;

    const produto = document.getElementById('exp_nome').innerText;
    const codigo = document.getElementById('exp_codigo').innerText;
    const banho = document.getElementById('exp_banho').innerText;

    if (!cliente) {
        alert("Por favor, digite o nome do cliente.");
        return;
    }

    const observacaoFinal = `[${tipoGravacao}] ${observacaoOriginal}`;
    const lojaNome = windowUserLoja || localStorage.getItem('lojaLogada') || "LOJA NÃO IDENTIFICADA"

    // 2. Monta o payload para o Banco
    const payload = {
        codigo: codigo,
        produto: produto,
        quantidade: 1,
        banho: banho,
        cliente: cliente,
        loja: window.userLoja || localStorage.getItem('lojaLogada') || "LOJA NÃO IDENTIFICADA",
        status_pedido: 'EM ABERTO',
        tipo: 'SAIDA',
        observacao_pedido: observacaoFinal,
        data_pedido: new Date().toISOString().split('T')[0]
    };

    try {
        // 3. Salvar no Supabase
        const { error: erroPedido } = await supabaseClient
            .from('personalizados')
            .insert([payload]);

        if (erroPedido) throw erroPedido;

        // 4. Subtração de Estoque
        const { data: itemEstoque, error: erroBusca } = await supabaseClient
            .from('estoque')
            .select('quantidade, id')
            .eq('codigo', codigo)
            .eq('banho', banho)
            .single();

        if (itemEstoque) {
            const novaQuantidade = Number(itemEstoque.quantidade) - 1;
            await supabaseClient
                .from('estoque')
                .update({ quantidade: novaQuantidade })
                .eq('id', itemEstoque.id);
        }

        // --- 5. GERAÇÃO DA MENSAGEM WHATSAPP ---
        const textoWhatsapp = `PEDIDOS DE PERSONALIZADOS ${lojaNome}

🔺1 unidade

CLIENTE: ${cliente.toUpperCase()}
Cod: ${codigo} - ${produto}
Banho: ${banho}❗️
Descrição pedido:
${observacaoFinal}`;

        // Tenta copiar para a área de transferência
        try {
            await navigator.clipboard.writeText(textoWhatsapp);
            alert("✅ Pedido salvo!\n\nExtrato para WhatsApp copiado automaticamente.");
        } catch (errCopia) {
            console.error("Erro ao copiar texto:", errCopia);
            // Fallback caso o navegador bloqueie a cópia
            alert("✅ Pedido salvo!");
        }

        // 6. Limpeza e Recarregamento
        if (typeof closeExpandedModal === "function") closeExpandedModal();
        if (typeof loadAllData === "function") await loadAllData();

    } catch (err) {
        console.error("Erro no processo:", err);
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
    const btnManual = document.getElementById('btnNovoManual');

    wrapper.style.transform = `translateX(${index * -50}%)`;
    currentTab = index;

    // --- CORREÇÃO AQUI ---
    if (btnManual) {
        // Se index é 0 (Admin), remove o "none" e usa "block" ou "flex"
        // Como ele está num grid, o ideal é 'block' ou apenas limpar o display
        btnManual.style.display = (index === 0) ? 'block' : 'none';
    }

    panels.forEach((panel, i) => {
        panel.style.visibility = (i === index) ? 'visible' : 'hidden';
    });

    window.scrollTo(0, 0);
}

function updateStoreFilter(orders) {
    const select = document.getElementById('filterStore');

    // PROTEÇÃO: Se o elemento não existir no HTML, a função para aqui silenciosamente
    if (!select) return;

    // Pega as lojas únicas
    const stores = [...new Set(orders.map(o => o.loja_vendedor))].filter(Boolean);

    // Monta o HTML das opções
    let options = '<option value="all">Todas as Lojas</option>';
    stores.forEach(s => {
        options += `<option value="${s}">${s}</option>`;
    });

    // Aplica ao select
    select.innerHTML = options;
}

function applyFilters() {
    // 1. Pega os valores dos filtros que AINDA EXISTEM
    const start = document.getElementById('filterStart')?.value;
    const end = document.getElementById('filterEnd')?.value;

    // As linhas abaixo tentavam ler elementos que você removeu do HTML. 
    // Usamos o operador ?. e um valor padrão para não dar erro.
    const store = document.getElementById('filterStore')?.value || 'all';
    const approvalFilter = document.getElementById('filterApproval')?.value || 'all';

    // 2. IMPORTANTE: Usar a variável correta que alimentamos no loadAllData
    let filtered = [...allOrdersData];

    // 3. Filtro por Período (Data)
    if (start || end) {
        filtered = filtered.filter(o => {
            if (!o.data_pedido) return false;
            const dataPedido = o.data_pedido.split('T')[0];

            if (start && dataPedido < start) return false;
            if (end && dataPedido > end) return false;
            return true;
        });
    }

    // 4. Filtro por Loja (Se o elemento existir no HTML, ele filtra, senão ignora)
    if (store && store !== 'all' && store !== '') {
        filtered = filtered.filter(o => o.loja === store);
    }

    // 5. Filtro por Aprovação (Se o elemento existir no HTML, ele filtra, senão ignora)
    if (approvalFilter === 'aprovados') {
        filtered = filtered.filter(o => o.aprovado_loja === true || o.aprovado_loja === 'true');
    } else if (approvalFilter === 'pendentes') {
        filtered = filtered.filter(o => o.aprovado_loja !== true && o.aprovado_loja !== 'true');
    }

    // 6. Renderiza os cards atualizados
    if (typeof renderOrders === "function") {
        renderOrders(filtered);
    }

    // 7. Atualiza os contadores do Dashboard
    if (typeof updateDashboard === "function") {
        updateDashboard(filtered);
    }
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

// --- FUNÇÃO DE PESQUISA DO ESTOQUE ---
function searchInventory(query) {
    // 1. Converte a busca para minúsculo e limpa espaços
    const searchTerm = query.toLowerCase().trim();

    // 2. Se não houver termo de busca, volta a mostrar o inventário completo
    if (!searchTerm) {
        renderStock(inventory);
        return;
    }

    // 3. Filtra o array global 'inventory' (que foi carregado no loadAllData)
    const filteredItems = inventory.filter(item => {
        // Transformamos tudo em string para evitar erros com números
        const cod = String(item.codigo || "").toLowerCase();
        const nome = String(item.nome || "").toLowerCase();
        const banho = String(item.banho || "").toLowerCase();

        // Verifica se o termo está no código, no nome ou no banho
        return cod.includes(searchTerm) ||
            nome.includes(searchTerm) ||
            banho.includes(searchTerm);
    });

    // 4. Chama a função de desenho apenas com os itens encontrados
    renderStock(filteredItems);
}

async function uploadPhoto(input, slot) {
    const file = input.files[0];
    if (!file) return;

    const label = document.getElementById(`label_foto_${slot}`);
    const preview = document.getElementById(`prev_foto_${slot}`);
    const hiddenInput = document.getElementById(`url_foto_${slot}`);

    try {
        label.innerText = "⏳..."; // Feedback visual de carregando

        // Nome único para o arquivo: ID_PEDIDO_TIMESTAMP.jpg
        const pedidoId = document.getElementById('edit_id').value || 'novo';
        const fileName = `${pedidoId}_${Date.now()}_${slot}.jpg`;

        // 1. Upload para o Storage
        const { data, error } = await supabaseClient.storage
            .from('fotos_pedidos')
            .upload(fileName, file);

        if (error) throw error;

        // 2. Pegar a URL pública
        const { data: publicData } = supabaseClient.storage
            .from('fotos_pedidos')
            .getPublicUrl(fileName);

        const publicUrl = publicData.publicUrl;

        // 3. Atualizar a interface
        hiddenInput.value = publicUrl;
        preview.src = publicUrl;
        preview.style.display = "block";
        label.style.display = "none";

        console.log(`Foto ${slot} enviada:`, publicUrl);

    } catch (err) {
        console.error("Erro no upload:", err);
        alert("Erro ao enviar foto: " + err.message);
        label.innerText = "❌ Erro";
    }
}

// Função para controlar a expansão do card
let isScrolling = false;
window.addEventListener('touchmove', () => isScrolling = true);
window.addEventListener('touchstart', () => isScrolling = false);

function toggleCardExpansion(id, event) {
    // Se o usuário estiver arrastando a tela, não expande o card
    if (isScrolling) return;

    const card = document.getElementById(`card-${id}`);
    const det = document.getElementById(`details-${id}`);

    if (event) {
        // Lógica da bolha (mantida)
        const posX = event.clientX || (event.touches && event.touches[0].clientX);
        const posY = event.clientY || (event.touches && event.touches[0].clientY);

        if (posX && posY) {
            const circle = document.createElement("span");
            const diameter = Math.max(card.clientWidth, card.clientHeight);
            const radius = diameter / 2;
            const rect = card.getBoundingClientRect();

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${posX - rect.left - radius}px`;
            circle.style.top = `${posY - rect.top - radius}px`;
            circle.classList.add("ripple-effect");

            const oldRipple = card.querySelector(".ripple-effect");
            if (oldRipple) oldRipple.remove();

            card.appendChild(circle);
            setTimeout(() => circle.remove(), 600);
        }
    }

    // LÓGICA DE EXPANDIR REFORÇADA
    if (det.style.maxHeight === "0px" || det.style.maxHeight === "") {
        // Fecha outros cards abertos para não virar bagunça (opcional)
        document.querySelectorAll('.order-details-expanded').forEach(el => el.style.maxHeight = "0px");
        det.style.maxHeight = "800px"; // Valor alto o suficiente para caber tudo
    } else {
        det.style.maxHeight = "0px";
    }
}

// Função de Zoom na Foto (Lightbox Moderna)
function expandImage(src) {
    // Remove qualquer overlay que tenha ficado aberto por erro
    const oldOverlay = document.getElementById('img-overlay');
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'img-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.cursor = 'zoom-out';
    overlay.style.animation = 'fadeIn 0.3s ease';

    overlay.innerHTML = `
        <img src="${src}" style="max-width: 90%; max-height: 90%; border-radius: 10px; box-shadow: 0 0 30px rgba(0,0,0,0.5); transform: scale(0.9); transition: transform 0.3s ease;" id="expanded-img">
        <span style="position: absolute; top: 20px; right: 20px; color: white; font-size: 30px; font-family: Arial;">&times;</span>
    `;

    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);

    // Pequeno delay para a animação de entrada da imagem
    setTimeout(() => {
        const img = document.getElementById('expanded-img');
        if (img) img.style.transform = 'scale(1)';
    }, 10);
}

function exibirFotoInformativa() {
    // ID do seu arquivo que você enviou
    const fileId = "1640rn5l0NRWtDgs5efu0f_9_exTff81l";

    // Novo formato de link para garantir a renderização (Thumbnail de alta qualidade)
    const urlDireta = `https://lh3.googleusercontent.com/d/${fileId}=s1600`;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 15px;
    `;

    overlay.innerHTML = `
        <div style="position: relative; width: 100%; max-width: 500px;">
            <span style="position: absolute; top: -45px; right: 0; color: white; font-size: 35px;">&times;</span>
            <img src="${urlDireta}" 
                 style="width: 100%; height: auto; border-radius: 12px; border: 2px solid #D4AF37; box-shadow: 0 0 25px rgba(212, 175, 55, 0.4);"
                 onerror="this.src='https://via.placeholder.com/500x800?text=Erro+ao+Carregar+Imagem+do+Drive'">
            <p style="color: #D4AF37; margin-top: 15px; font-size: 13px; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Toque para fechar
            </p>
        </div>
    `;

    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}

// 1. Função para abrir e BUSCAR os dados na hora (evita erro de variável indefinida)
async function openInventoryConference() {
    const modal = document.getElementById('modalConferenciaEstoque');
    if (modal) modal.style.display = 'flex';

    const tbody = document.getElementById('corpoTabelaConferencia');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Carregando estoque...</td></tr>';

    try {
        // Buscamos os dados diretamente do Supabase para garantir que estão atualizados
        const { data: itens, error } = await supabaseClient
            .from('estoque') // Certifique-se que o nome da tabela é 'estoque'
            .select('*')
            .order('codigo', { ascending: true });

        if (error) throw error;
        renderConferenciaEstoque(itens);
    } catch (err) {
        console.error("Erro na conferência:", err);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Erro ao carregar dados do banco.</td></tr>';
    }
}

function fecharModalConferencia() {
    document.getElementById('modalConferenciaEstoque').style.display = 'none';
}

// 2. Renderiza os itens recebidos do banco
function renderConferenciaEstoque(itens) {
    const tbody = document.getElementById('corpoTabelaConferencia');
    if (!tbody) return;

    if (!itens || itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhum item encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = itens.map(item => {
        // AJUSTE: Usando 'item.quantidade' que é o nome real da sua coluna
        const valorAtual = item.quantidade !== undefined && item.quantidade !== null ? item.quantidade : 0;

        const nomeExibicao = item.banho ? `${item.nome} - ${item.banho}` : item.nome;

        return `
        <tr style="border-bottom: 1px solid #eee; height: 55px;">
            <td style="padding: 10px; font-weight: bold; color: #555;">${item.codigo || '---'}</td>
            <td style="padding: 10px; font-size: 13px;">
                <span style="display: block; font-weight: 500;">${nomeExibicao}</span>
            </td>
            <td style="padding: 10px; text-align: center;">
                <input type="number" 
                    value="${valorAtual}" 
                    id="stk_${item.id}" 
                    style="width: 65px; padding: 8px; text-align: center; border: 1px solid #ccc; border-radius: 6px; font-weight: bold; background: #fffcf5;">
            </td>
            <td style="padding: 10px; text-align: center;">
                <button onclick="updateQuickStock(${item.id})" 
                    style="background: #D4AF37; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    OK
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

// 3. Salva a alteração individual
async function updateQuickStock(id) {
    const input = document.getElementById(`stk_${id}`);
    if (!input) return;

    const novoValor = parseInt(input.value);
    const btn = event.target; // Pega o botão que foi clicado

    // Feedback visual de carregando
    const originalText = btn.innerText;
    btn.innerText = "...";
    btn.disabled = true;

    try {
        // AJUSTE: 'quantidade' é o nome da coluna no seu Supabase
        const { error } = await supabaseClient
            .from('estoque')
            .update({ quantidade: novoValor })
            .eq('id', id);

        if (error) throw error;

        // Feedback de sucesso
        btn.innerText = "✅";
        btn.style.background = "#28a745";

        setTimeout(() => {
            btn.innerText = "OK";
            btn.style.background = "#D4AF37";
            btn.disabled = false;
        }, 2000);

    } catch (err) {
        console.error("Erro ao salvar estoque:", err);
        alert("Erro ao salvar: " + err.message);
        btn.innerText = "Erro";
        btn.style.background = "#dc3545";
        btn.disabled = false;
    }
}

// Abre o modal para novo produto
// Função para abrir o modal de produto
window.openNewProductModal = function () {
    const modal = document.getElementById('productModal');
    if (modal) {
        // Força a exibição usando flex e !important via JS
        modal.style.setProperty('display', 'flex', 'important');

        // Limpa os campos para um novo cadastro
        document.getElementById('prod_id').value = "";
        document.getElementById('prod_codigo').value = "";
        document.getElementById('prod_nome').value = "";
        document.getElementById('prod_banho').value = "OURO";
        document.getElementById('prod_quantidade').value = "0";
        document.getElementById('prod_url').value = "";

        document.getElementById('productModalTitle').innerText = "Cadastrar Novo Produto";
        console.log("Modal de estoque aberto");
    } else {
        console.error("Elemento 'productModal' não encontrado!");
    }
};

// Função para fechar o modal
window.closeProductModal = function () {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
    }
};

// Função para salvar no Supabase
window.saveProduct = async function () {
    const codigo = document.getElementById('prod_codigo').value;
    const nome = document.getElementById('prod_nome').value.toUpperCase();
    const banho = document.getElementById('prod_banho').value;
    const quantidade = parseInt(document.getElementById('prod_quantidade').value) || 0;
    const imagem_url = document.getElementById('prod_url').value;

    if (!codigo || !nome) {
        alert("Preencha Código e Nome!");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('estoque')
            .insert([{
                codigo,
                nome,
                banho,
                quantidade,
                imagem_url
            }]);

        if (error) throw error;

        alert("Produto cadastrado com sucesso!");
        closeProductModal();

        // Atualiza a lista geral se a função existir
        if (typeof loadAllData === "function") loadAllData();

    } catch (err) {
        console.error("Erro ao inserir:", err);
        alert("Erro: " + err.message);
    }
};

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

// Salva ou Atualiza o Produto
async function saveProduct() {
    const id = document.getElementById('prod_id').value;
    const codigo = document.getElementById('prod_codigo').value;
    const nome = document.getElementById('prod_nome').value.toUpperCase();
    const banho = document.getElementById('prod_banho').value;
    const quantidade = parseInt(document.getElementById('prod_quantidade').value);
    const imagem_url = document.getElementById('prod_url').value;

    if (!codigo || !nome) {
        alert("Código e Nome são obrigatórios!");
        return;
    }

    const productData = {
        codigo,
        nome,
        banho,
        quantidade,
        imagem_url
    };

    // Se tiver ID, adiciona ao objeto para o Supabase saber que é atualização
    if (id) productData.id = id;

    try {
        // .upsert faz o seguinte: se o ID existe, ele dá UPDATE. Se não existe, dá INSERT.
        const { error } = await supabaseClient
            .from('estoque')
            .upsert(productData);

        if (error) throw error;

        alert("Produto salvo com sucesso!");
        closeProductModal();

        // Recarrega os dados para atualizar a lista de inventário e o autocomplete
        if (typeof loadAllData === "function") loadAllData();

    } catch (err) {
        console.error("Erro ao salvar produto:", err);
        alert("Erro ao salvar: " + err.message);
    }
}