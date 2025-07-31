// --- Seleção de Elementos DOM Globais ---
// Elementos principais
const itemForm = document.getElementById('itemForm');
const itemNameInput = document.getElementById('itemName');
const itemDescriptionInput = document.getElementById('itemDescription');
const itemQuantityInput = document.getElementById('itemQuantity');
const itemPurchasePriceInput = document.getElementById('itemPurchasePrice');
const itemSalePriceInput = document.getElementById('itemSalePrice');
const itemSupplierInput = document.getElementById('itemSupplier');
const saveItemBtn = itemForm.querySelector('#saveItemBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const itemImageInput = document.getElementById('itemImage');
const previewImage = document.getElementById('previewImage');
const noImageText = document.getElementById('noImageText');

// Elementos da Visão Geral do Estoque
const totalUniqueItemsCount = document.getElementById('totalUniqueItemsCount');
const totalItemsCount = document.getElementById('totalItemsCount');
const totalPurchaseValue = document.getElementById('totalPurchaseValue');
const totalSaleValue = document.getElementById('totalSaleValue');
const potentialProfit = document.getElementById('potentialProfit');
const lowStockThresholdInput = document.getElementById('lowStockThreshold');
const lowStockItemsCount = document.getElementById('lowStockItemsCount');
const showLowStockItemsBtn = document.getElementById('showLowStockItemsBtn');

// Elementos da Tabela e Busca
const searchTermInput = document.getElementById('searchTerm');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const itemListBody = document.getElementById('itemList');
const itemTable = document.getElementById('itemTable');
const noItemsMessage = document.getElementById('noItemsMessage');

// Elementos de Paginação
const itemsPerPageSelect = document.getElementById('itemsPerPage');
const prevPageBtn = document.getElementById('prevPageBtn');
const currentPageInfo = document.getElementById('currentPageInfo');
const nextPageBtn = document.getElementById('nextPageBtn');

// Botões de Importação/Exportação
const exportDataBtn = document.getElementById('exportData');
const importFileInput = document.getElementById('importFile');

// Notificações
const notificationContainer = document.getElementById('notification-container');

// Modais (referências para uso em modalHandlers.js)
const descriptionModal = document.getElementById('descriptionModal');
const descriptionModalText = document.getElementById('descriptionModalText');
const descriptionModalTitle = document.getElementById('descriptionModalTitle');
const confirmationModal = document.getElementById('confirmationModal');
const confirmationModalTitle = document.getElementById('confirmationModalTitle');
const confirmationModalText = document.getElementById('confirmationModalText');
const confirmActionButton = document.getElementById('confirmActionButton');
const historyModal = document.getElementById('historyModal');
const historyModalTitle = document.getElementById('historyModalTitle');
const historyItemName = document.getElementById('historyItemName');
const movementTypeSelect = document.getElementById('movementType');
const movementQuantityInput = document.getElementById('movementQuantity');
const addMovementBtn = document.getElementById('addMovementBtn');
const historyListBody = document.getElementById('historyList');
const noHistoryMessage = document.getElementById('noHistoryMessage');

// Toggle Modo Escuro
const darkModeToggle = document.getElementById('darkModeToggle');

// Botão Limpar Tudo
const clearAllDataBtn = document.getElementById('clearAllDataBtn');


// --- Variáveis de Estado Global ---
let editingItemId = null;
let confirmationCallback = null; // Usado pelo modal de confirmação
let currentPage = 1;
let itemsPerPage = parseInt(itemsPerPageSelect.value);
let currentSortColumn = 'name';
let currentSortDirection = 'asc';

// --- Funções Principais de Renderização e Atualização ---

/**
 * Exibe ou esconde a tabela e a mensagem "nenhum item", ajustando o texto.
 * @param {Array} itemsToDisplay - Itens que serão exibidos na página atual.
 * @param {boolean} isFilteredOrSearched - Indica se há um filtro ou busca ativos.
 */
function toggleTableVisibility(itemsToDisplay, isFilteredOrSearched) {
    if (itemsToDisplay.length === 0) {
        itemTable.classList.add('hidden');
        noItemsMessage.classList.remove('hidden');
        if (isFilteredOrSearched) {
            noItemsMessage.textContent = `Nenhum item encontrado que corresponda à sua busca ou filtro.`;
        } else {
            noItemsMessage.textContent = 'Nenhum item cadastrado ainda. Comece adicionando um novo item!';
        }
    } else {
        itemTable.classList.remove('hidden');
        noItemsMessage.classList.add('hidden');
    }
}

/**
 * Renderiza a lista de itens na tabela com filtragem, ordenação e paginação.
 */
function renderItems() {
    let items = loadItems(); // Função em utils.js

    // 1. Filtragem (Busca)
    const searchTerm = searchTermInput.value.toLowerCase().trim();
    let filteredItems = items.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
               (item.description && item.description.toLowerCase().includes(searchTerm)) ||
               (item.supplier && item.supplier.toLowerCase().includes(searchTerm));
    });

    // 2. Filtro de Baixo Estoque (se ativado)
    if (showLowStockItemsBtn.classList.contains('active')) {
        const threshold = parseInt(lowStockThresholdInput.value) || 0;
        filteredItems = filteredItems.filter(item => item.quantity <= threshold);
    }

    // 3. Ordenação
    filteredItems.sort((a, b) => {
        let valA = a[currentSortColumn];
        let valB = b[currentSortColumn];

        if (['quantity', 'purchasePrice', 'salePrice'].includes(currentSortColumn)) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else if (currentSortColumn === 'registeredAt') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        } else {
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // 4. Paginação
    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredItems.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    } else if (totalPages === 0) {
        currentPage = 0;
    } else if (currentPage === 0 && totalPages > 0) {
        currentPage = 1;
    }

    const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage;
    const endIndex = itemsPerPage === 'all' ? filteredItems.length : startIndex + itemsPerPage;
    const itemsToDisplay = filteredItems.slice(startIndex, endIndex);

    const isFilteredOrSearched = searchTerm !== "" || showLowStockItemsBtn.classList.contains('active');
    toggleTableVisibility(itemsToDisplay, isFilteredOrSearched);

    // Update pagination controls
    updatePaginationControls(totalPages, filteredItems.length);
    updateSortIndicators(); // Update sort icons

    // Build HTML string to minimize DOM reflows
    let htmlContent = '';
    if (itemsToDisplay.length === 0 && isFilteredOrSearched) {
        htmlContent = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Nenhum item corresponde aos critérios de busca ou filtro.</td></tr>`;
    } else {
        itemsToDisplay.forEach(item => {
            const purchasePriceFormatted = parseFloat(item.purchasePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const salePriceFormatted = parseFloat(item.salePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const descriptionSnippet = item.description && item.description.length > 50
                ? item.description.substring(0, 47) + '...'
                : item.description || 'N/A';
            const showMoreButton = item.description && item.description.length > 50
                ? `<button class="btn-link" onclick="openDescriptionModal('${item.id}')">Ver Mais</button>`
                : '';

            htmlContent += `
                <tr data-id="${item.id}">
                    <td><img src="${item.image || 'assets/images/placeholder.png'}" alt="${item.name}" loading="lazy"></td>
                    <td>${item.id.substring(0, 8)}...</td>
                    <td>${item.name}</td>
                    <td class="description-cell" data-item-id="${item.id}">
                        ${descriptionSnippet} ${showMoreButton}
                    </td>
                    <td class="${item.quantity <= (parseInt(lowStockThresholdInput.value) || 0) ? 'low-stock-quantity' : ''}">${item.quantity}</td>
                    <td>${purchasePriceFormatted}</td>
                    <td>${salePriceFormatted}</td>
                    <td>${item.supplier || 'N/A'}</td>
                    <td>${new Date(item.registeredAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <button class="btn btn-info btn-action" onclick="editItem('${item.id}')" title="Editar Item"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-warning btn-action" onclick="showHistoryModal('${item.id}')" title="Ver Histórico/Movimentar"><i class="fas fa-history"></i></button>
                        <button class="btn btn-danger btn-action" onclick="deleteItem('${item.id}')" title="Excluir Item"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    itemListBody.innerHTML = htmlContent;
}


/**
 * Atualiza os indicadores de ordenação nas colunas da tabela.
 */
function updateSortIndicators() {
    document.querySelectorAll('#itemTable th[data-sort]').forEach(header => {
        header.classList.remove('asc', 'desc');
        const column = header.dataset.sort;
        if (column === currentSortColumn) {
            header.classList.add(currentSortDirection);
        }
        // Remove existing sort icons and add new ones
        header.querySelectorAll('.fa-sort, .fa-sort-up, .fa-sort-down').forEach(icon => icon.remove());
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-sort');
        if (column === currentSortColumn) {
            icon.classList.remove('fa-sort');
            icon.classList.add(currentSortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
        }
        header.appendChild(icon);
    });
}

/**
 * Atualiza os valores da visão geral do estoque.
 */
function updateStockSummary() {
    const items = loadItems(); // Função em utils.js
    let totalItems = 0;
    let totalPurchase = 0;
    let totalSale = 0;

    items.forEach(item => {
        totalItems += item.quantity;
        totalPurchase += item.quantity * parseFloat(item.purchasePrice);
        totalSale += item.quantity * parseFloat(item.salePrice);
    });

    const profit = totalSale - totalPurchase;

    totalUniqueItemsCount.textContent = items.length;
    totalItemsCount.textContent = totalItems;
    totalPurchaseValue.textContent = totalPurchase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    totalSaleValue.textContent = totalSale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    potentialProfit.textContent = profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Atualiza a contagem de itens com baixo estoque
    const threshold = parseInt(lowStockThresholdInput.value) || 0;
    const lowStockItems = items.filter(item => item.quantity <= threshold).length;
    lowStockItemsCount.textContent = lowStockItems;
}


/**
 * Atualiza os controles de paginação (botões e info).
 * @param {number} totalPages - Número total de páginas.
 * @param {number} totalFilteredItems - Número total de itens após filtragem e busca.
 */
function updatePaginationControls(totalPages, totalFilteredItems) {
    currentPageInfo.textContent = `Página ${totalPages > 0 ? currentPage : 0} de ${totalPages} (${totalFilteredItems} itens)`;

    prevPageBtn.disabled = currentPage === 1 || totalPages === 0;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0 || itemsPerPage === 'all';

    if (itemsPerPage === 'all') {
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
    }
}


// --- Event Listeners Globais ---

// Paginação
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderItems();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(loadItems().filter(item => {
        const searchTerm = searchTermInput.value.toLowerCase().trim();
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) ||
                              (item.description && item.description.toLowerCase().includes(searchTerm)) ||
                              (item.supplier && item.supplier.toLowerCase().includes(searchTerm));
        const threshold = parseInt(lowStockThresholdInput.value) || 0;
        const matchesLowStock = !showLowStockItemsBtn.classList.contains('active') || item.quantity <= threshold;
        return matchesSearch && matchesLowStock;
    }).length / itemsPerPage);

    if (currentPage < totalPages) {
        currentPage++;
        renderItems();
    }
});

itemsPerPageSelect.addEventListener('change', (e) => {
    itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
    currentPage = 1; // Reset page when items per page changes
    renderItems();
});

// Busca por termo
searchTermInput.addEventListener('input', () => {
    currentPage = 1; // Reset page on new search
    renderItems();
    if (searchTermInput.value.trim() !== '') {
        clearSearchBtn.style.display = 'inline-block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
});

// Limpar Busca
clearSearchBtn.addEventListener('click', () => {
    searchTermInput.value = '';
    clearSearchBtn.style.display = 'none';
    currentPage = 1;
    renderItems();
});

// Ordenação de colunas
document.querySelectorAll('#itemTable th[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
        const column = header.dataset.sort;
        if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = column;
            currentSortDirection = 'asc'; // Padrão ao mudar de coluna
        }
        renderItems();
    });
});

// Limite de Baixo Estoque
lowStockThresholdInput.addEventListener('input', () => {
    const threshold = parseInt(lowStockThresholdInput.value);
    if (!isNaN(threshold) && threshold >= 0) {
        localStorage.setItem('lowStockThreshold', threshold.toString());
    }
    renderItems(); // Re-renderiza para aplicar o novo limite
    updateStockSummary(); // Atualiza a contagem de baixo estoque no resumo
});

// Botão para filtrar/mostrar itens com baixo estoque
showLowStockItemsBtn.addEventListener('click', () => {
    showLowStockItemsBtn.classList.toggle('active'); // Alterna a classe 'active'
    // Atualiza o texto e ícone do botão
    if (showLowStockItemsBtn.classList.contains('active')) {
        showLowStockItemsBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Esconder Baixo Estoque';
    } else {
        showLowStockItemsBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ver Baixo Estoque';
    }
    renderItems(); // Re-renderiza para aplicar o filtro
});


// Toggle Modo Escuro
darkModeToggle.addEventListener('click', toggleDarkMode); // Função em utils.js


// Botão Limpar Tudo
if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', clearAllData); // Função em utils.js
}

// --- Inicialização da Aplicação ---
document.addEventListener('DOMContentLoaded', () => {
    loadDarkModePreference(); // Função em utils.js
    const savedLowStockThreshold = localStorage.getItem('lowStockThreshold');
    if (savedLowStockThreshold !== null) {
        lowStockThresholdInput.value = parseInt(savedLowStockThreshold);
    }
    renderItems();
    updateStockSummary(); // Initial summary update
    itemImageInput.value = ''; // Garante que inputs file limpem seus valores ao carregar
    importFileInput.value = '';

    // Initialize search clear button state
    clearSearchBtn.style.display = searchTermInput.value.trim() !== '' ? 'inline-block' : 'none';

    // Event listeners para botões do modal de confirmação (em modalHandlers.js)
    confirmActionButton.addEventListener('click', confirmAction);
    confirmationModal.querySelector('.close-button').addEventListener('click', cancelConfirmation);
    confirmationModal.addEventListener('click', (event) => {
        if (event.target === confirmationModal) {
            cancelConfirmation();
        }
    });

    // Event listeners para o modal de descrição (em modalHandlers.js)
    descriptionModal.querySelector('.close-button').addEventListener('click', closeDescriptionModal);
    descriptionModal.addEventListener('click', (event) => {
        if (event.target === descriptionModal) {
            closeDescriptionModal();
        }
    });

    // Event listeners para o modal de histórico (em modalHandlers.js)
    historyModal.querySelector('.close-button').addEventListener('click', closeHistoryModal);
    historyModal.addEventListener('click', (event) => {
        if (event.target === historyModal) {
            closeHistoryModal();
        }
    });

    // Event listener para adicionar movimento (em historyManagement.js)
    addMovementBtn.addEventListener('click', addMovement);


    updateSortIndicators(); // Define os ícones de ordenação iniciais
});