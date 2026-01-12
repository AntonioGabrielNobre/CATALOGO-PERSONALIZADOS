// Use o link que termina em output=csv
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7yVtRQ5cGabTZdRPmF-eYm8hduyJTGbYalE6bSd0DbX9rafq9U0FZTaTewef1tFI7OTNVntxtHQY_/pub?output=csv'; 

let inventory = [];

async function loadData() {
    const status = document.getElementById('statusIndicator');
    status.innerText = "Sincronizando...";
    
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        
        const lines = data.split(/\r?\n/).filter(line => line.trim() !== "");
        const separator = lines[0].includes(';') ? ';' : ',';

        inventory = lines.slice(1).map(line => {
            // Regex para separar colunas respeitando aspas
            const cols = line.split(separator).map(c => c.replace(/^"|"$/g, '').trim());
            
            return {
                imagem: fixDriveLink(cols[0]), // Coluna A
                codigo: cols[1],               // Coluna B
                banho: cols[2],                // Coluna C
                quantidade: cols[3],           // Coluna D
                nome: cols[4]                  // Coluna E
            };
        }).filter(item => item.nome);

        render(inventory);
        status.innerText = "Sincronizado";
        status.style.background = "#e8f5e9";
    } catch (err) {
        status.innerText = "Erro de conexão";
        console.error(err);
    }
}

// NOVA FUNÇÃO DE IMAGEM - TESTADA
function fixDriveLink(url) {
    if (!url) return '';
    
    // Se não for link do drive, retorna o que estiver lá
    if (!url.includes('drive.google.com')) return url;

    let id = "";
    // Extrai o ID do arquivo
    const match = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
    if (match) {
        id = match[1] || match[2];
    }

    // LINK DE THUMBNAIL (O segredo para não ser bloqueado)
    // s1000 força o Google a gerar uma imagem de 1000px de qualidade
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}=s1000` : '';
}

function render(items) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = items.map(item => `
        <div class="card">
            <div class="card-img-wrapper">
                <img src="${item.imagem}" 
                     alt="${item.nome}" 
                     loading="lazy"
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/300/D3BCA5/FFFFFF?text=Sem+Foto'">
                <div class="badge-qty">${item.quantidade} un.</div>
            </div>
            <div class="card-content">
                <span class="code-tag">REF: ${item.codigo}</span>
                <strong class="product-name">${item.nome}</strong>
                <div class="bath-info">Banho: ${item.banho}</div>
            </div>
        </div>
    `).join('');
}

document.getElementById('searchBar').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = inventory.filter(i => 
        (i.nome && i.nome.toLowerCase().includes(term)) || 
        (i.codigo && i.codigo.toLowerCase().includes(term)) ||
        (i.banho && i.banho.toLowerCase().includes(term))
    );
    render(filtered);
});

loadData();