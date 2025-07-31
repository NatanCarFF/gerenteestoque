// --- Seleção de Elementos DOM ---
const itemForm = document.getElementById('itemForm');
const itemImageInput = document.getElementById('itemImage');
const previewImage = document.getElementById('previewImage');
const noImageText = document.getElementById('noImageText');
const itemNameInput = document.getElementById('itemName');
const itemDescriptionInput = document.getElementById('itemDescription');
const itemQuantityInput = document.getElementById('itemQuantity');
const itemPurchasePriceInput = document.getElementById('itemPurchasePrice');
const itemSalePriceInput = document.getElementById('itemSalePrice');
const itemSupplierInput = document.getElementById('itemSupplier');
const saveItemBtn = itemForm.querySelector('#saveItemBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const searchTermInput = document.getElementById('searchTerm');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const exportDataBtn = document.getElementById('exportData');
const importFileInput = document.getElementById('importFile');

const itemListBody = document.getElementById('itemList');
const itemTable = document.getElementById('itemTable');
const noItemsMessage = document.getElementById('noItemsMessage');
const notificationContainer = document.getElementById('notification-container');

// Elementos da Visão Geral do Estoque
const totalUniqueItemsCount = document.getElementById('totalUniqueItemsCount'); // Adicionado
const totalItemsCount = document.getElementById('totalItemsCount');
const totalPurchaseValue = document.getElementById('totalPurchaseValue');
const totalSaleValue = document.getElementById('totalSaleValue');
const potentialProfit = document.getElementById('potentialProfit');
const lowStockThresholdInput = document.getElementById('lowStockThreshold');
const lowStockItemsCount = document.getElementById('lowStockItemsCount');
const showLowStockItemsBtn = document.getElementById('showLowStockItemsBtn');

// Elementos de Paginação
const itemsPerPageSelect = document.getElementById('itemsPerPage');
const prevPageBtn = document.getElementById('prevPageBtn');
const currentPageInfo = document.getElementById('currentPageInfo');
const nextPageBtn = document.getElementById('nextPageBtn');

// Modais
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

// Botão Limpar Tudo (novo)
const clearAllDataBtn = document.getElementById('clearAllDataBtn');


let editingItemId = null;
let confirmationCallback = null;
let currentPage = 1;
let itemsPerPage = parseInt(itemsPerPageSelect.value);
let currentSortColumn = 'name';
let currentSortDirection = 'asc';

// --- Funções Auxiliares ---

/**
 * Exibe uma notificação temporária no canto superior direito da tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success', 'error', 'info', 'warning').
 * @param {number} duration - Duração em milissegundos para a notificação permanecer.
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.classList.add('notification', type);

    let iconClass = '';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-triangle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-circle';
    else iconClass = 'fas fa-info-circle';

    notification.innerHTML = `
        <i class="icon ${iconClass}"></i>
        <span class="message">${message}</span>
    `;

    notificationContainer.appendChild(notification);

    void notification.offsetWidth; // Força o reflow para garantir que a animação slideIn funcione

    notification.style.animation = 'slideIn 0.5s forwards';

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s forwards';
        notification.addEventListener('animationend', () => notification.remove(), { once: true });
    }, duration);
}

/**
 * Carrega os itens do LocalStorage.
 * @returns {Array} Array de objetos de itens.
 */
function loadItems() {
    try {
        const items = JSON.parse(localStorage.getItem('stockItems')) || [];
        return items;
    } catch (e) {
        console.error("Erro ao carregar itens do LocalStorage:", e);
        showNotification("Erro ao carregar dados do estoque. Pode ser que o LocalStorage esteja corrompido.", "error");
        return [];
    }
}

/**
 * Salva os itens no LocalStorage.
 * @param {Array} items - Array de objetos de itens a serem salvos.
 */
function saveItems(items) {
    try {
        localStorage.setItem('stockItems', JSON.stringify(items));
        renderItems();
        updateStockSummary();
    } catch (e) {
        console.error("Erro ao salvar itens no LocalStorage:", e);
        showNotification("Erro ao salvar dados do estoque. O armazenamento pode estar cheio ou inacessível.", "error");
    }
}

/**
 * Limpa o formulário após adicionar/editar um item.
 */
function clearForm() {
    itemForm.reset();
    itemImageInput.value = '';
    previewImage.src = '';
    previewImage.classList.add('hidden');
    noImageText.classList.remove('hidden');
    editingItemId = null;
    saveItemBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Item';
    saveItemBtn.classList.remove('btn-success', 'saved');
    cancelEditBtn.style.display = 'none';
}

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
    let items = loadItems();

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
    const items = loadItems();
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
 * Gera um ID único simples.
 * @returns {string} ID único.
 */
function generateId() {
    return 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Adiciona um novo item ou atualiza um item existente.
 */
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = itemNameInput.value.trim();
    const description = itemDescriptionInput.value.trim();
    const quantity = parseInt(itemQuantityInput.value);
    const purchasePrice = parseFloat(itemPurchasePriceInput.value);
    const salePrice = parseFloat(itemSalePriceInput.value);
    const supplier = itemSupplierInput.value.trim();
    let image = previewImage.src;

    // Basic Validation
    if (!name || isNaN(quantity) || quantity < 0 || isNaN(purchasePrice) || purchasePrice < 0 || isNaN(salePrice) || salePrice < 0) {
        showNotification('Por favor, preencha todos os campos obrigatórios (Nome, Quantidade, Preço de Compra, Preço de Venda) com valores válidos.', 'error');
        return;
    }

    let items = loadItems();

    if (editingItemId) {
        // Edit existing item
        const itemIndex = items.findIndex(item => item.id === editingItemId);
        if (itemIndex > -1) {
            items[itemIndex] = {
                id: editingItemId,
                name,
                description,
                quantity,
                purchasePrice,
                salePrice,
                supplier,
                image: image || '', // Ensure empty string if no image
                registeredAt: items[itemIndex].registeredAt // Keep original registration date
            };
            showNotification('Item atualizado com sucesso!', 'success');
        } else {
            showNotification('Erro: Item não encontrado para edição.', 'error');
        }
    } else {
        // Add new item
        const newItem = {
            id: generateId(),
            name,
            description,
            quantity,
            purchasePrice,
            salePrice,
            supplier,
            image: image || '',
            registeredAt: new Date().toISOString()
        };
        items.push(newItem);
        showNotification('Item adicionado com sucesso!', 'success');
    }
    saveItems(items);
    clearForm();
});

/**
 * Preenche o formulário para edição de um item.
 * @param {string} id - ID do item a ser editado.
 */
function editItem(id) {
    const items = loadItems();
    const itemToEdit = items.find(item => item.id === id);

    if (itemToEdit) {
        editingItemId = itemToEdit.id;
        itemNameInput.value = itemToEdit.name;
        itemDescriptionInput.value = itemToEdit.description;
        itemQuantityInput.value = itemToEdit.quantity;
        itemPurchasePriceInput.value = itemToEdit.purchasePrice;
        itemSalePriceInput.value = itemToEdit.salePrice;
        itemSupplierInput.value = itemToEdit.supplier;

        if (itemToEdit.image) {
            previewImage.src = itemToEdit.image;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
        } else {
            previewImage.src = '';
            previewImage.classList.add('hidden');
            noImageText.classList.remove('hidden');
        }

        saveItemBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Item';
        cancelEditBtn.style.display = 'inline-block';
        showNotification('Modo de edição ativado. Altere os campos e clique em "Atualizar Item".', 'info');
        // Scroll to form
        itemForm.scrollIntoView({ behavior: 'smooth' });
    } else {
        showNotification('Item não encontrado para edição.', 'error');
    }
}

/**
 * Exclui um item após confirmação.
 * @param {string} id - ID do item a ser excluído.
 */
function deleteItem(id) {
    showConfirmationModal('Tem certeza que deseja excluir este item? Esta ação é irreversível!', () => {
        let items = loadItems();
        const initialLength = items.length;
        items = items.filter(item => item.id !== id);
        if (items.length < initialLength) {
            saveItems(items);
            showNotification('Item excluído com sucesso!', 'success');
            // Remove item history as well
            let history = loadMovementHistory();
            delete history[id]; // Delete history for this item
            saveMovementHistory(history);
            renderItems(); // Re-render to ensure pagination and display are correct
        } else {
            showNotification('Erro: Item não encontrado para exclusão.', 'error');
        }
    }, 'Confirmar Exclusão');
}

/**
 * Abre o modal de descrição com o texto completo.
 * @param {string} itemId - ID do item cuja descrição será exibida.
 */
function openDescriptionModal(itemId) {
    const items = loadItems();
    const item = items.find(i => i.id === itemId);
    if (item) {
        descriptionModalTitle.textContent = `Descrição de: ${item.name}`;
        descriptionModalText.textContent = item.description || 'Nenhuma descrição fornecida.';
        descriptionModal.style.display = 'block';
    }
}

/**
 * Fecha o modal de descrição.
 */
function closeDescriptionModal() {
    descriptionModal.style.display = 'none';
    descriptionModalText.textContent = '';
    descriptionModalTitle.textContent = 'Descrição do Item';
}


// --- Funções do Modal de Confirmação ---

/**
 * Exibe o modal de confirmação.
 * @param {string} message - Mensagem a ser exibida no modal.
 * @param {Function} callback - Função a ser executada se o usuário confirmar.
 * @param {string} confirmBtnText - Texto para o botão de confirmação (opcional).
 * @param {string} title - Título do modal (opcional).
 */
function showConfirmationModal(message, callback, confirmBtnText = 'Confirmar', title = 'Confirmação') {
    confirmationModalTitle.textContent = title;
    confirmationModalText.textContent = message;
    confirmActionButton.textContent = confirmBtnText;
    confirmationCallback = callback;
    confirmationModal.style.display = 'block';
}

/**
 * Oculta o modal de confirmação e reseta o callback.
 */
function closeConfirmationModal() {
    confirmationModal.style.display = 'none';
    confirmationCallback = null;
}

/**
 * Executa o callback de confirmação e fecha o modal.
 */
function confirmAction() {
    if (confirmationCallback) {
        confirmationCallback();
    }
    closeConfirmationModal();
}

/**
 * Cancela a ação de confirmação e fecha o modal.
 */
function cancelConfirmation() {
    closeConfirmationModal();
}

// --- Funções de Histórico de Movimentação ---

/**
 * Carrega o histórico de movimentação do LocalStorage.
 * @returns {Object} Objeto com o histórico de movimentação.
 */
function loadMovementHistory() {
    try {
        return JSON.parse(localStorage.getItem('movementHistory')) || {};
    } catch (e) {
        console.error("Erro ao carregar histórico de movimentação:", e);
        showNotification("Erro ao carregar histórico de movimentação.", "error");
        return {};
    }
}

/**
 * Salva o histórico de movimentação no LocalStorage.
 * @param {Object} history - Objeto com o histórico de movimentação a ser salvo.
 */
function saveMovementHistory(history) {
    try {
        localStorage.setItem('movementHistory', JSON.stringify(history));
    } catch (e) {
        console.error("Erro ao salvar histórico de movimentação:", e);
        showNotification("Erro ao salvar histórico de movimentação.", "error");
    }
}

/**
 * Abre o modal de histórico de movimentação para um item.
 * @param {string} itemId - ID do item.
 */
function showHistoryModal(itemId) {
    const items = loadItems();
    const item = items.find(i => i.id === itemId);

    if (!item) {
        showNotification('Item não encontrado para histórico.', 'error');
        return;
    }

    historyModalTitle.dataset.itemId = itemId; // Armazena o ID do item no título do modal
    historyItemName.textContent = item.name;
    renderMovementHistory(itemId);
    historyModal.style.display = 'block';
}

/**
 * Fecha o modal de histórico de movimentação.
 */
function closeHistoryModal() {
    historyModal.style.display = 'none';
    historyModalTitle.dataset.itemId = '';
    historyItemName.textContent = '';
    movementQuantityInput.value = 1; // Reset quantity input
}

/**
 * Renderiza o histórico de movimentação de um item específico.
 * @param {string} itemId - ID do item.
 */
function renderMovementHistory(itemId) {
    historyListBody.innerHTML = '';
    const history = loadMovementHistory();
    const itemHistory = history[itemId] || [];

    if (itemHistory.length === 0) {
        noHistoryMessage.classList.remove('hidden');
        historyListBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhum histórico de movimentação para este item.</td></tr>`;
        return;
    } else {
        noHistoryMessage.classList.add('hidden');
    }

    itemHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Mais recentes primeiro

    itemHistory.forEach((movement, index) => {
        const row = historyListBody.insertRow();
        row.innerHTML = `
            <td>${movement.type === 'entrada' ? '<i class="fas fa-arrow-alt-circle-up success-icon"></i> Entrada' : '<i class="fas fa-arrow-alt-circle-down danger-icon"></i> Saída'}</td>
            <td>${movement.quantity}</td>
            <td>${new Date(movement.date).toLocaleString('pt-BR')}</td>
            <td>
                <button class="btn btn-danger btn-action-small" onclick="deleteMovementHistory('${itemId}', ${index})" title="Remover Movimento"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
    });
}

/**
 * Adiciona um movimento de entrada/saída para um item.
 */
addMovementBtn.addEventListener('click', () => {
    const itemId = historyModalTitle.dataset.itemId;
    if (!itemId) {
        showNotification('Erro: Item não selecionado para movimentação.', 'error');
        return;
    }

    const type = movementTypeSelect.value;
    const quantity = parseInt(movementQuantityInput.value);

    if (isNaN(quantity) || quantity <= 0) {
        showNotification('Por favor, insira uma quantidade válida para o movimento.', 'error');
        return;
    }

    let items = loadItems();
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
        showNotification('Erro: Item não encontrado.', 'error');
        return;
    }

    let currentItem = items[itemIndex];
    let newQuantity = currentItem.quantity;

    if (type === 'saida') {
        if (quantity > newQuantity) {
            showNotification('Quantidade de saída excede o estoque disponível.', 'error');
            return;
        }
        newQuantity -= quantity;
    } else { // entrada
        newQuantity += quantity;
    }

    currentItem.quantity = newQuantity; // Atualiza a quantidade do item
    saveItems(items); // Salva os itens atualizados no LocalStorage

    let history = loadMovementHistory();
    if (!history[itemId]) {
        history[itemId] = [];
    }
    history[itemId].push({
        type,
        quantity,
        date: new Date().toISOString()
    });
    saveMovementHistory(history);

    showNotification(`Movimento de ${type} de ${quantity} unidades registrado para ${currentItem.name}.`, 'success');
    renderMovementHistory(itemId); // Atualiza o histórico no modal
    updateStockSummary(); // Atualiza o resumo do estoque
    renderItems(); // Re-renderiza a tabela principal para atualizar a quantidade
});


/**
 * Deleta um registro de movimento específico do histórico.
 * @param {string} itemId - ID do item.
 * @param {number} index - Índice do movimento no array de histórico do item.
 */
function deleteMovementHistory(itemId, index) {
    showConfirmationModal('Tem certeza que deseja remover este registro de movimentação? Isso não reverte a quantidade do estoque.', () => {
        let history = loadMovementHistory();
        if (history[itemId] && history[itemId][index]) {
            history[itemId].splice(index, 1); // Remove o registro pelo índice
            saveMovementHistory(history);
            showNotification('Registro de movimentação removido.', 'success');
            renderMovementHistory(itemId); // Atualiza o histórico no modal
        } else {
            showNotification('Erro: Registro de movimentação não encontrado.', 'error');
        }
    }, 'Remover Registro');
}

// --- Funções de Importação/Exportação ---

/**
 * Exporta os dados do estoque e histórico para um arquivo JSON.
 */
exportDataBtn.addEventListener('click', () => {
    const stockItems = loadItems();
    const movementHistory = loadMovementHistory();
    const lowStockThreshold = localStorage.getItem('lowStockThreshold') || '5'; // Inclui o threshold

    const data = {
        stockItems,
        movementHistory,
        lowStockThreshold: parseInt(lowStockThreshold) // Garante que seja um número
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estoque_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Dados exportados com sucesso!', 'success');
});

/**
 * Importa dados de um arquivo JSON.
 */
importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            if (importedData.stockItems && Array.isArray(importedData.stockItems)) {
                showConfirmationModal('Ao importar, todos os dados atuais do estoque e histórico serão substituídos. Deseja continuar?', () => {
                    localStorage.setItem('stockItems', JSON.stringify(importedData.stockItems));
                    if (importedData.movementHistory) {
                        localStorage.setItem('movementHistory', JSON.stringify(importedData.movementHistory));
                    }
                    if (importedData.lowStockThreshold !== undefined) {
                        localStorage.setItem('lowStockThreshold', importedData.lowStockThreshold.toString());
                        lowStockThresholdInput.value = parseInt(importedData.lowStockThreshold);
                    }
                    showNotification('Dados importados com sucesso!', 'success');
                    renderItems();
                    updateStockSummary();
                }, 'Confirmar Importação');
            } else {
                showNotification('Formato de arquivo JSON inválido ou dados de estoque ausentes.', 'error');
            }
        } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            showNotification('Erro ao processar arquivo. Certifique-se de que é um JSON válido.', 'error');
        }
    };
    reader.onerror = () => {
        showNotification('Erro ao ler o arquivo.', 'error');
    };
    reader.readAsText(file);
});

// --- Event Listeners Gerais ---

// Carregar imagem de pré-visualização
itemImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showNotification('Por favor, selecione um arquivo de imagem (jpg, png, gif, etc.).', 'error');
            itemImageInput.value = '';
            previewImage.src = '';
            previewImage.classList.add('hidden');
            noImageText.classList.remove('hidden');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
        };
        reader.onerror = () => {
            showNotification('Erro ao carregar a imagem. Tente novamente.', 'error');
            previewImage.src = '';
            previewImage.classList.add('hidden');
            noImageText.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        previewImage.src = '';
        previewImage.classList.add('hidden');
        noImageText.classList.remove('hidden');
    }
});

// Cancelar Edição
cancelEditBtn.addEventListener('click', clearForm);

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

function updatePaginationControls(totalPages, totalFilteredItems) {
    currentPageInfo.textContent = `Página ${totalPages > 0 ? currentPage : 0} de ${totalPages} (${totalFilteredItems} itens)`;

    prevPageBtn.disabled = currentPage === 1 || totalPages === 0;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0 || itemsPerPage === 'all';

    if (itemsPerPage === 'all') {
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
    }
}


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
darkModeToggle.addEventListener('click', toggleDarkMode);

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    // Change icon based on dark mode state
    darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function loadDarkModePreference() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Event listener para o botão "Limpar Tudo"
if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', clearAllData);
}


/**
 * Limpa todos os dados do LocalStorage relacionados ao estoque e histórico,
 * e reinicia a visualização da página.
 */
function clearAllData() {
    showConfirmationModal('Tem certeza que deseja APAGAR TODOS os dados do estoque e histórico? Esta ação é irreversível!', () => {
        localStorage.removeItem('stockItems');
        localStorage.removeItem('movementHistory');
        localStorage.removeItem('lowStockThreshold');
        showNotification('Todos os dados foram apagados com sucesso!', 'success');
        clearForm();
        searchTermInput.value = '';
        currentPage = 1;
        itemsPerPageSelect.value = '10';
        itemsPerPage = 10;
        showLowStockItemsBtn.classList.remove('active');
        showLowStockItemsBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ver Baixo Estoque';
        renderItems();
        updateStockSummary();
        clearSearchBtn.style.display = 'none';
        lowStockThresholdInput.value = 5; // Reset threshold to default
        localStorage.setItem('lowStockThreshold', '5');
    }, 'Confirmar Limpeza Total', 'Limpar Tudo');
}


// --- Inicialização ---\
document.addEventListener('DOMContentLoaded', () => {
    loadDarkModePreference();
    const savedLowStockThreshold = localStorage.getItem('lowStockThreshold');
    if (savedLowStockThreshold !== null) {
        lowStockThresholdInput.value = parseInt(savedLowStockThreshold);
    }
    renderItems();
    updateStockSummary(); // Initial summary update
    itemImageInput.value = '';
    importFileInput.value = '';

    // Initialize search clear button state
    clearSearchBtn.style.display = searchTermInput.value.trim() !== '' ? 'inline-block' : 'none';

    // Event listeners for confirmation modal buttons
    confirmActionButton.addEventListener('click', confirmAction);
    confirmationModal.querySelector('.close-button').addEventListener('click', cancelConfirmation);
    confirmationModal.addEventListener('click', (event) => {
        if (event.target === confirmationModal) {
            cancelConfirmation();
        }
    });

    // Event listeners for description modal
    descriptionModal.querySelector('.close-button').addEventListener('click', closeDescriptionModal);
    descriptionModal.addEventListener('click', (event) => {
        if (event.target === descriptionModal) {
            closeDescriptionModal();
        }
    });

    // Event listeners for history modal
    historyModal.querySelector('.close-button').addEventListener('click', closeHistoryModal);
    historyModal.addEventListener('click', (event) => {
        if (event.target === historyModal) {
            closeHistoryModal();
        }
    });

    updateSortIndicators(); // Set initial sort icons
});