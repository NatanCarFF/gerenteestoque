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
const saveItemBtn = itemForm.querySelector('#saveItemBtn'); // Referência pelo ID agora
const cancelEditBtn = document.getElementById('cancelEditBtn');

const searchTermInput = document.getElementById('searchTerm');
const clearSearchBtn = document.getElementById('clearSearchBtn'); // Novo botão de limpar busca
const exportDataBtn = document.getElementById('exportData');
const importFileInput = document.getElementById('importFile');

const itemListBody = document.getElementById('itemList'); // tbody da tabela
const itemTable = document.getElementById('itemTable');
const noItemsMessage = document.getElementById('noItemsMessage');
const notificationContainer = document.getElementById('notification-container'); // Contêiner de notificações

// Elementos da Visão Geral do Estoque
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

let editingItemId = null; // Variável para controlar se estamos editando um item existente
let confirmationCallback = null; // Função de callback para o modal de confirmação

// Variáveis de Paginação
let currentPage = 1;
let itemsPerPage = parseInt(itemsPerPageSelect.value); // Valor inicial

// Variáveis de Ordenação
let currentSortColumn = 'name'; // Coluna padrão para ordenação
let currentSortDirection = 'asc'; // Direção padrão para ordenação

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

    // Força o reflow para garantir que a animação slideIn funcione
    void notification.offsetWidth;

    // Adiciona a classe para iniciar a animação
    notification.style.animation = 'slideIn 0.5s forwards';

    // Remove a notificação após a duração e inicia a animação de saída
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
        renderItems(); // Renderiza os itens novamente após salvar
        updateStockSummary(); // Atualiza a visão geral do estoque
    } catch (e) {
        console.error("Erro ao salvar itens no LocalStorage:", e);
        showNotification("Erro ao salvar dados do estoque. O armazenamento pode estar cheio ou inacessível.", "error");
    }
}

/**
 * Limpa o formulário após adicionar/editar um item.
 */
function clearForm() {
    itemForm.reset(); // Reseta todos os campos do formulário
    itemImageInput.value = ''; // Garante que o input file também seja limpo
    previewImage.src = '';
    previewImage.classList.add('hidden');
    noImageText.classList.remove('hidden');
    editingItemId = null; // Reseta o ID de edição
    saveItemBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Item'; // Volta o texto e ícone do botão
    saveItemBtn.classList.remove('btn-success', 'saved'); // Remove classes de confirmação visual
    cancelEditBtn.style.display = 'none'; // Esconde o botão de cancelar
}

/**
 * Exibe ou esconde a tabela e a mensagem "nenhum item".
 * @param {Array} filteredItems - Itens já filtrados para verificação.
 */
function toggleTableVisibility(filteredItems) {
    const searchTerm = searchTermInput.value.toLowerCase().trim();

    if (filteredItems.length === 0 && searchTerm === "") { // Nenhum item e nenhuma busca ativa
        itemTable.classList.add('hidden');
        noItemsMessage.classList.remove('hidden');
        noItemsMessage.textContent = 'Nenhum item cadastrado ainda. Comece adicionando um novo item!';
    } else if (filteredItems.length === 0 && searchTerm !== "") { // Nenhuma busca encontrou resultados
        itemTable.classList.add('hidden');
        noItemsMessage.classList.remove('hidden');
        noItemsMessage.textContent = `Nenhum item encontrado para "${searchTerm}".`;
    }
    else { // Itens encontrados (com ou sem busca)
        itemTable.classList.remove('hidden');
        noItemsMessage.classList.add('hidden');
    }
}

/**
 * Renderiza a lista de itens na tabela com filtragem, ordenação e paginação.
 */
function renderItems() {
    itemListBody.innerHTML = ''; // Limpa a tabela antes de renderizar
    let items = loadItems();

    // 1. Filtragem (Busca)
    const searchTerm = searchTermInput.value.toLowerCase().trim();
    let filteredItems = items.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
               (item.description && item.description.toLowerCase().includes(searchTerm)) || // Verifica se description existe
               (item.supplier && item.supplier.toLowerCase().includes(searchTerm)); // Verifica se supplier existe
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

        // Conversão para números para ordenação numérica
        if (['quantity', 'purchasePrice', 'salePrice'].includes(currentSortColumn)) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else if (currentSortColumn === 'registeredAt') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        } else {
            // Garante que sejam strings para toLowerCase e localeCompare
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
        currentPage = totalPages; // Ajusta a página se ela exceder o total
    } else if (totalPages === 0) {
        currentPage = 0; // Nenhuma página se não houver itens
    } else if (currentPage === 0 && totalPages > 0) {
        currentPage = 1; // Reseta para a primeira página se for 0 e houver itens
    }


    const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage;
    const endIndex = itemsPerPage === 'all' ? filteredItems.length : startIndex + itemsPerPage;
    const itemsToDisplay = filteredItems.slice(startIndex, endIndex);

    toggleTableVisibility(itemsToDisplay); // Atualiza a visibilidade da tabela/mensagem com base nos itens a exibir

    if (itemsToDisplay.length === 0 && (searchTerm !== "" || showLowStockItemsBtn.classList.contains('active'))) {
        itemListBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Nenhum item corresponde aos critérios de busca ou filtro.</td></tr>`;
    } else if (itemsToDisplay.length === 0 && searchTerm === "") {
        // Já tratado por toggleTableVisibility
        return;
    }


    itemsToDisplay.forEach(item => {
        const row = itemListBody.insertRow();
        row.dataset.id = item.id; // Armazena o ID no dataset da linha

        // Formatação de moeda para preços
        const purchasePriceFormatted = parseFloat(item.purchasePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const salePriceFormatted = parseFloat(item.salePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        row.innerHTML = `
            <td><img src="${item.image || 'assets/images/placeholder.png'}" alt="${item.name}" loading="lazy"></td>
            <td>${item.id.substring(0, 8)}...</td>
            <td>${item.name}</td>
            <td class="description-cell" data-item-id="${item.id}" data-full-description="${item.description || ''}">${item.description || 'N/A'}</td>
            <td class="${item.quantity <= (parseInt(lowStockThresholdInput.value) || 0) ? 'low-stock-quantity' : ''}">${item.quantity}</td>
            <td>${purchasePriceFormatted}</td>
            <td>${salePriceFormatted}</td>
            <td>${item.supplier || 'N/A'}</td>
            <td>${new Date(item.registeredAt).toLocaleDateString('pt-BR')}</td>
            <td>
                <button class="btn btn-info btn-action" onclick="editItem('${item.id}')" title="Editar Item"><i class="fas fa-edit"></i></button>
                <button class="btn btn-warning btn-action" onclick="showHistoryModal('${item.id}')" title="Ver Histórico/Movimentar"><i class="fas fa-history"></i></button>
                <button class="btn btn-danger btn-action" onclick="showConfirmationModal('Tem certeza que deseja excluir o item &quot;${item.name}&quot;?', () => deleteItemConfirmed('${item.id}'))" title="Excluir Item"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
    });

    updatePaginationControls(filteredItems.length, totalPages);
    updateStockSummary(); // Garante que o resumo seja atualizado com os dados atuais
}


/**
 * Atualiza a visão geral do estoque: total de itens, valores e lucro.
 */
function updateStockSummary() {
    const items = loadItems();
    const lowStockThreshold = parseInt(lowStockThresholdInput.value) || 0;

    let totalItems = 0;
    let totalPurchase = 0;
    let totalSale = 0;
    let lowStockCount = 0;

    items.forEach(item => {
        totalItems += item.quantity;
        totalPurchase += item.quantity * parseFloat(item.purchasePrice);
        totalSale += item.quantity * parseFloat(item.salePrice);
        if (item.quantity <= lowStockThreshold) {
            lowStockCount++;
        }
    });

    totalItemsCount.textContent = totalItems.toLocaleString('pt-BR');
    totalPurchaseValue.textContent = totalPurchase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    totalSaleValue.textContent = totalSale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    potentialProfit.textContent = (totalSale - totalPurchase).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    lowStockItemsCount.textContent = lowStockCount.toLocaleString('pt-BR');

    // Salva o limite de baixo estoque no LocalStorage
    localStorage.setItem('lowStockThreshold', lowStockThreshold.toString());
}

/**
 * Atualiza os controles de paginação.
 * @param {number} totalFilteredItems - Número total de itens após filtragem.
 * @param {number} totalPages - Número total de páginas.
 */
function updatePaginationControls(totalFilteredItems, totalPages) {
    const isAllItems = itemsPerPageSelect.value === 'all';

    if (isAllItems || totalPages === 0) {
        currentPageInfo.textContent = `Todos os ${totalFilteredItems} itens`;
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
    } else {
        currentPageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }
}


/**
 * Carrega o histórico de movimentações do LocalStorage para um item específico.
 * @param {string} itemId - O ID do item.
 * @returns {Array} Array de objetos de movimentação.
 */
function loadMovementHistory(itemId) {
    try {
        const allHistory = JSON.parse(localStorage.getItem('movementHistory')) || {};
        return allHistory[itemId] || [];
    } catch (e) {
        console.error("Erro ao carregar histórico do LocalStorage:", e);
        showNotification("Erro ao carregar histórico de movimentação.", "error");
        return [];
    }
}

/**
 * Salva o histórico de movimentações no LocalStorage.
 * @param {string} itemId - O ID do item.
 * @param {Array} history - Array de objetos de movimentação para o item.
 */
function saveMovementHistory(itemId, history) {
    try {
        const allHistory = JSON.parse(localStorage.getItem('movementHistory')) || {};
        allHistory[itemId] = history;
        localStorage.setItem('movementHistory', JSON.stringify(allHistory));
    } catch (e) {
        console.error("Erro ao salvar histórico no LocalStorage:", e);
        showNotification("Erro ao salvar histórico de movimentação.", "error");
    }
}

/**
 * Renderiza o histórico de movimentação de um item no modal.
 * @param {string} itemId - O ID do item.
 */
function renderHistory(itemId) {
    historyListBody.innerHTML = '';
    const history = loadMovementHistory(itemId);

    if (history.length === 0) {
        noHistoryMessage.classList.remove('hidden');
        historyListBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhum histórico de movimentação para este item.</td></tr>`;
    } else {
        noHistoryMessage.classList.add('hidden');
        // Ordena o histórico do mais recente para o mais antigo
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        history.forEach(mov => {
            const row = historyListBody.insertRow();
            row.dataset.movementId = mov.id;
            const typeIcon = mov.type === 'entrada' ? '<i class="fas fa-arrow-alt-circle-down" style="color: green;"></i> Entrada' : '<i class="fas fa-arrow-alt-circle-up" style="color: red;"></i> Saída';
            const quantityText = mov.type === 'saida' ? `-${mov.quantity}` : `+${mov.quantity}`;

            row.innerHTML = `
                <td>${typeIcon}</td>
                <td>${quantityText}</td>
                <td>${new Date(mov.date).toLocaleDateString('pt-BR')} ${new Date(mov.date).toLocaleTimeString('pt-BR')}</td>
                <td>
                    <button class="btn btn-danger btn-action" onclick="showConfirmationModal('Tem certeza que deseja remover este movimento?', () => deleteMovementConfirmed('${itemId}', '${mov.id}'))" title="Remover Movimento"><i class="fas fa-times"></i></button>
                </td>
            `;
        });
    }
}


// --- Funções de CRUD e Movimentação ---

/**
 * Adiciona um novo item ou atualiza um item existente.
 * @param {Event} event - O evento de submit do formulário.
 */
async function addItem(event) {
    event.preventDefault();

    // --- Validação Básica ---
    if (!itemNameInput.value.trim()) {
        showNotification("O nome do item é obrigatório.", "error");
        itemNameInput.focus();
        return;
    }
    const quantity = parseInt(itemQuantityInput.value);
    if (isNaN(quantity) || quantity < 0) {
        showNotification("A quantidade deve ser um número válido e não negativo.", "error");
        itemQuantityInput.focus();
        return;
    }
    const purchasePrice = parseFloat(itemPurchasePriceInput.value);
    if (isNaN(purchasePrice) || purchasePrice < 0) {
        showNotification("O preço de compra deve ser um número válido e não negativo.", "error");
        itemPurchasePriceInput.focus();
        return;
    }
    const salePrice = parseFloat(itemSalePriceInput.value);
    if (isNaN(salePrice) || salePrice < 0) {
        showNotification("O preço de venda deve ser um número válido e não negativo.", "error");
        itemSalePriceInput.focus();
        return;
    }
    if (salePrice < purchasePrice) {
        showNotification("O preço de venda não pode ser menor que o preço de compra.", "error");
        itemSalePriceInput.focus();
        return;
    }


    const imageFile = itemImageInput.files[0];
    let imageDataUrl = '';

    if (imageFile) {
        const MAX_IMAGE_SIZE_MB = 1;
        if (imageFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            showNotification(`A imagem é muito grande. Tamanho máximo permitido: ${MAX_IMAGE_SIZE_MB}MB.`, "error");
            itemImageInput.value = '';
            return;
        }

        try {
            imageDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(imageFile);
            });
        } catch (error) {
            console.error("Erro ao ler arquivo de imagem:", error);
            showNotification("Não foi possível carregar a imagem. Tente outra.", "error");
            return;
        }
    } else if (editingItemId) {
        const existingItem = loadItems().find(item => item.id === editingItemId);
        if (existingItem) {
            imageDataUrl = existingItem.image || '';
        }
    }

    const newItem = {
        id: editingItemId || Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        name: itemNameInput.value.trim(),
        description: itemDescriptionInput.value.trim(),
        quantity: quantity,
        purchasePrice: purchasePrice,
        salePrice: salePrice,
        supplier: itemSupplierInput.value.trim(),
        image: imageDataUrl,
        registeredAt: editingItemId ? loadItems().find(item => item.id === editingItemId).registeredAt : new Date().toISOString()
    };

    let items = loadItems();

    if (editingItemId) {
        items = items.map(item => item.id === editingItemId ? { ...item, ...newItem } : item);
        showNotification('Item atualizado com sucesso!', 'success');
    } else {
        items.push(newItem);
        showNotification('Item cadastrado com sucesso!', 'success');
    }

    saveItems(items);
    clearForm();
    applySaveAnimation(); // Aplica a animação de "salvo"
}

/**
 * Preenche o formulário para edição de um item.
 * @param {string} id - O ID do item a ser editado.
 */
function editItem(id) {
    const items = loadItems();
    const itemToEdit = items.find(item => item.id === id);

    if (itemToEdit) {
        editingItemId = id;
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

        saveItemBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar Item';
        saveItemBtn.classList.remove('btn-success', 'saved'); // Garante que não tenha estado de salvo
        cancelEditBtn.style.display = 'inline-flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        showNotification("Item não encontrado para edição.", "error");
    }
}

/**
 * Lógica para excluir um item após confirmação.
 * @param {string} id - O ID do item a ser excluído.
 */
function deleteItemConfirmed(id) {
    let items = loadItems();
    const initialLength = items.length;
    items = items.filter(item => item.id !== id);

    if (items.length < initialLength) {
        saveItems(items);
        // Também remove o histórico do item excluído
        const allHistory = JSON.parse(localStorage.getItem('movementHistory')) || {};
        delete allHistory[id];
        localStorage.setItem('movementHistory', JSON.stringify(allHistory));

        showNotification('Item excluído com sucesso!', 'success');
        if (editingItemId === id) {
            clearForm();
        }
    } else {
        showNotification("Erro ao excluir item: Item não encontrado.", "error");
    }
    closeConfirmationModal();
}

/**
 * Adiciona um movimento de entrada ou saída para um item.
 */
function addMovement() {
    const itemId = historyModal.dataset.itemId;
    if (!itemId) return;

    let items = loadItems();
    const item = items.find(i => i.id === itemId);

    if (!item) {
        showNotification("Item não encontrado para adicionar movimento.", "error");
        return;
    }

    const type = movementTypeSelect.value;
    const quantity = parseInt(movementQuantityInput.value);

    if (isNaN(quantity) || quantity <= 0) {
        showNotification("A quantidade do movimento deve ser um número positivo.", "error");
        movementQuantityInput.focus();
        return;
    }

    let newQuantity = item.quantity;
    if (type === 'saida') {
        if (quantity > item.quantity) {
            showNotification(`Não há estoque suficiente. Quantidade atual: ${item.quantity}.`, "error");
            movementQuantityInput.focus();
            return;
        }
        newQuantity -= quantity;
    } else { // entrada
        newQuantity += quantity;
    }

    // Atualiza a quantidade do item
    item.quantity = newQuantity;
    saveItems(items); // Salva os itens atualizados

    // Registra no histórico
    const history = loadMovementHistory(itemId);
    history.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), // ID único para o movimento
        type: type,
        quantity: quantity,
        date: new Date().toISOString()
    });
    saveMovementHistory(itemId, history);

    renderHistory(itemId); // Atualiza a tabela de histórico no modal
    showNotification('Movimento adicionado e estoque atualizado!', 'success');
    movementQuantityInput.value = '1'; // Reseta o campo de quantidade
}

/**
 * Exclui um movimento específico do histórico de um item.
 * @param {string} itemId - O ID do item.
 * @param {string} movementId - O ID do movimento a ser excluído.
 */
function deleteMovementConfirmed(itemId, movementId) {
    let items = loadItems();
    const item = items.find(i => i.id === itemId);
    if (!item) {
        showNotification("Erro ao remover movimento: Item não encontrado.", "error");
        closeConfirmationModal();
        return;
    }

    let history = loadMovementHistory(itemId);
    const movementToRemove = history.find(mov => mov.id === movementId);

    if (!movementToRemove) {
        showNotification("Erro ao remover movimento: Movimento não encontrado.", "error");
        closeConfirmationModal();
        return;
    }

    // Reverte a quantidade do estoque antes de remover o movimento
    if (movementToRemove.type === 'entrada') {
        item.quantity -= movementToRemove.quantity;
    } else { // 'saida'
        item.quantity += movementToRemove.quantity;
    }

    // Filtra para remover o movimento
    history = history.filter(mov => mov.id !== movementId);

    saveItems(items); // Salva o item com a quantidade revertida
    saveMovementHistory(itemId, history); // Salva o histórico sem o movimento

    renderHistory(itemId); // Re-renderiza o histórico no modal
    showNotification('Movimento removido e estoque revertido!', 'success');
    closeConfirmationModal();
}

// --- Funções de Imagem ---

/**
 * Lida com a pré-visualização da imagem selecionada.
 */
function handleImagePreview() {
    const file = itemImageInput.files[0];
    if (file) {
        const MAX_IMAGE_SIZE_MB = 1;
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            showNotification(`A imagem selecionada é muito grande para pré-visualização imediata. Tamanho máximo: ${MAX_IMAGE_SIZE_MB}MB.`, "warning", 5000);
            previewImage.src = '';
            previewImage.classList.add('hidden');
            noImageText.classList.remove('hidden');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
        };
        reader.onerror = (error) => {
            console.error("Erro ao ler arquivo de imagem para pré-visualização:", error);
            showNotification("Erro ao pré-visualizar imagem. Tente outro arquivo.", "error");
            previewImage.src = '';
            previewImage.classList.add('hidden');
            noImageText.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        if (!editingItemId || !loadItems().find(item => item.id === editingItemId)?.image) {
             previewImage.src = '';
             previewImage.classList.add('hidden');
             noImageText.classList.remove('hidden');
        }
    }
}

// --- Funções de Importação/Exportação ---

/**
 * Exporta os dados do estoque para um arquivo JSON.
 */
function exportData() {
    const items = loadItems();
    const history = JSON.parse(localStorage.getItem('movementHistory')) || {};

    if (items.length === 0 && Object.keys(history).length === 0) {
        showNotification("Não há dados (itens ou histórico) para exportar.", "info");
        return;
    }

    // Combina itens e histórico em um único objeto para exportação
    const dataToExport = {
        items: items,
        movementHistory: history
    };

    try {
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estoque_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao exportar dados:", error);
        showNotification("Erro ao exportar dados. Tente novamente.", "error");
    }
}

/**
 * Importa dados de um arquivo JSON.
 * @param {Event} event - O evento de mudança do input de arquivo.
 */
function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (!file.name.endsWith('.json')) {
        showNotification('Por favor, selecione um arquivo JSON válido.', 'error');
        importFileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Valida a estrutura esperada do arquivo importado
            if (!importedData || !Array.isArray(importedData.items) || typeof importedData.movementHistory !== 'object') {
                throw new Error('O arquivo JSON não contém a estrutura esperada (esperado um objeto com "items" e "movementHistory").');
            }

            const importedItems = importedData.items;
            const importedHistory = importedData.movementHistory;

            // Opcional: validar estrutura básica dos itens importados
            const isValidItemsImport = importedItems.every(item =>
                typeof item.id === 'string' &&
                typeof item.name === 'string' &&
                typeof item.quantity === 'number' &&
                typeof item.purchasePrice === 'number' &&
                typeof item.salePrice === 'number'
            );

            if (!isValidItemsImport && importedItems.length > 0) {
                 showNotification('O arquivo JSON contém itens com formato inválido. A importação pode não ser completa.', 'warning', 7000);
            }

            showConfirmationModal(
                'Tem certeza que deseja **sobrescrever todo o estoque atual e histórico** com os dados do arquivo importado? Esta ação não pode ser desfeita.',
                () => { // Callback para Confirmar (sobrescrever)
                    saveItems(importedItems); // Sobrescreve todo o estoque
                    localStorage.setItem('movementHistory', JSON.stringify(importedHistory)); // Sobrescreve todo o histórico
                    showNotification('Dados importados e estoque sobrescrito com sucesso!', 'success');
                    closeConfirmationModal();
                },
                () => { // Callback para Cancelar (apenas fecha o modal)
                    showNotification('Importação de dados cancelada.', 'info');
                    closeConfirmationModal();
                },
                'Sobrescrever',
                'btn-danger'
            );

        } catch (error) {
            console.error("Erro ao importar dados:", error);
            showNotification('Erro ao importar o arquivo JSON. Certifique-se de que o arquivo está no formato correto. Detalhes: ' + error.message, 'error');
        } finally {
            importFileInput.value = '';
        }
    };
    reader.readAsText(file);
}

// --- Funções de Modal (Geral) ---

/**
 * Mostra o modal de descrição.
 * @param {string} title - Título do modal.
 * @param {string} description - Conteúdo da descrição.
 */
function showDescriptionModal(title, description) {
    descriptionModalTitle.textContent = title;
    descriptionModalText.textContent = description;
    descriptionModal.classList.add('visible');
}

/**
 * Fecha o modal de descrição.
 */
function closeDescriptionModal() {
    descriptionModal.classList.remove('visible');
    descriptionModalTitle.textContent = '';
    descriptionModalText.textContent = '';
}

/**
 * Mostra o modal de confirmação personalizado.
 * @param {string} message - A mensagem de confirmação.
 * @param {Function} onConfirm - Função a ser executada se o usuário confirmar.
 * @param {Function} [onCancel=null] - Função opcional a ser executada se o usuário cancelar (clicar em "Cancelar" ou no overlay).
 * @param {string} [confirmBtnText='Confirmar'] - Texto para o botão de confirmação.
 * @param {string} [confirmBtnClass='btn-danger'] - Classe para o botão de confirmação.
 * @param {string} [cancelBtnText='Cancelar'] - Texto para o botão de cancelar.
 */
function showConfirmationModal(message, onConfirm, onCancel = null, confirmBtnText = 'Confirmar', confirmBtnClass = 'btn-danger', cancelBtnText = 'Cancelar') {
    confirmationModalText.innerHTML = message;
    confirmActionButton.textContent = confirmBtnText;
    confirmActionButton.className = `btn ${confirmBtnClass}`;

    const currentCancelButton = confirmationModal.querySelector('.modal-footer .btn-secondary');
    if (currentCancelButton) {
        currentCancelButton.textContent = cancelBtnText;
    }

    confirmationCallback = {
        confirm: onConfirm,
        cancel: onCancel
    };

    confirmationModal.classList.add('visible');
}

/**
 * Fecha o modal de confirmação.
 */
function closeConfirmationModal() {
    confirmationModal.classList.remove('visible');
    confirmationCallback = null;
}

/**
 * Função executada quando o botão "Confirmar" do modal de confirmação é clicado.
 */
function executeConfirmation() {
    if (confirmationCallback && confirmationCallback.confirm) {
        confirmationCallback.confirm();
    }
}

/**
 * Função executada quando o botão "Cancelar" ou "X" do modal de confirmação é clicado.
 */
function cancelConfirmation() {
    if (confirmationCallback && confirmationCallback.cancel) {
        confirmationCallback.cancel();
    } else {
        closeConfirmationModal();
    }
}

/**
 * Mostra o modal de histórico de movimentação para um item.
 * @param {string} itemId - O ID do item cujo histórico será exibido.
 */
function showHistoryModal(itemId) {
    const items = loadItems();
    const item = items.find(i => i.id === itemId);

    if (item) {
        historyModal.dataset.itemId = itemId; // Armazena o ID do item no dataset do modal
        historyItemName.textContent = item.name;
        renderHistory(itemId); // Renderiza o histórico específico do item
        historyModal.classList.add('visible');
    } else {
        showNotification("Item não encontrado para exibir histórico.", "error");
    }
}

/**
 * Fecha o modal de histórico de movimentação.
 */
function closeHistoryModal() {
    historyModal.classList.remove('visible');
    historyModal.removeAttribute('data-item-id'); // Limpa o ID do item
    historyItemName.textContent = '';
    historyListBody.innerHTML = ''; // Limpa a lista do histórico
}


// --- Funções de UI / Interatividade ---

/**
 * Aplica uma animação visual ao botão de salvar/atualizar.
 */
function applySaveAnimation() {
    const originalText = saveItemBtn.innerHTML;
    saveItemBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    saveItemBtn.classList.add('btn-success', 'saved'); // Adiciona classe de sucesso e 'saved' para CSS

    setTimeout(() => {
        saveItemBtn.innerHTML = originalText;
        saveItemBtn.classList.remove('btn-success', 'saved');
    }, 2000); // Remove o feedback visual após 2 segundos
}

/**
 * Alterna entre o modo claro e escuro.
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    // Salva a preferência do usuário
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);

    // Atualiza o ícone do toggle
    const icon = darkModeToggle.querySelector('i');
    if (isDarkMode) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

/**
 * Carrega a preferência de modo escuro do LocalStorage.
 */
function loadDarkModePreference() {
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference === 'true') {
        document.body.classList.add('dark-mode');
        // Atualiza o ícone ao carregar
        const icon = darkModeToggle.querySelector('i');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        document.body.classList.remove('dark-mode');
        const icon = darkModeToggle.querySelector('i');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

/**
 * Limpa o campo de busca e re-renderiza os itens.
 */
function clearSearch() {
    searchTermInput.value = '';
    clearSearchBtn.style.display = 'none'; // Esconde o botão novamente
    renderItems();
}

// --- Event Listeners ---

// Adiciona ou atualiza item ao submeter o formulário
itemForm.addEventListener('submit', addItem);

// Pré-visualização da imagem ao selecionar um arquivo
itemImageInput.addEventListener('change', handleImagePreview);

// Botão de cancelar edição
cancelEditBtn.addEventListener('click', clearForm);

// Busca em tempo real e exibe/esconde botão de limpar
searchTermInput.addEventListener('input', () => {
    renderItems();
    clearSearchBtn.style.display = searchTermInput.value.trim() !== '' ? 'inline-flex' : 'none';
});

// Botão de limpar busca
clearSearchBtn.addEventListener('click', clearSearch);

// Exportar dados
exportDataBtn.addEventListener('click', exportData);

// Importar dados
importFileInput.addEventListener('change', importData);

// Lógica de Ordenação da Tabela
itemTable.querySelectorAll('th[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
        const column = header.dataset.sort;
        if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = column;
            currentSortDirection = 'asc';
        }
        // Atualiza os ícones de ordenação
        itemTable.querySelectorAll('th .fas.fa-sort, th .fas.fa-sort-up, th .fas.fa-sort-down').forEach(icon => {
            icon.classList.remove('fa-sort-up', 'fa-sort-down');
            icon.classList.add('fa-sort');
        });
        const currentIcon = header.querySelector('.fas');
        if (currentIcon) {
            currentIcon.classList.remove('fa-sort');
            currentIcon.classList.add(currentSortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
        }
        renderItems();
    });
});

// Lógica de Paginação
itemsPerPageSelect.addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1; // Volta para a primeira página ao mudar a quantidade por página
    renderItems();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderItems();
    }
});

nextPageBtn.addEventListener('click', () => {
    const items = loadItems();
    const searchTerm = searchTermInput.value.toLowerCase().trim();
    let filteredItems = items.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
               (item.description && item.description.toLowerCase().includes(searchTerm)) ||
               (item.supplier && item.supplier.toLowerCase().includes(searchTerm));
    });

    if (showLowStockItemsBtn.classList.contains('active')) {
        const threshold = parseInt(lowStockThresholdInput.value) || 0;
        filteredItems = filteredItems.filter(item => item.quantity <= threshold);
    }

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderItems();
    }
});


// Adiciona um listener de evento de clique na tabela para o modal de descrição
itemListBody.addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList.contains('description-cell')) {
        const itemId = target.dataset.itemId;
        const fullDescription = target.dataset.fullDescription;
        const items = loadItems();
        const item = items.find(i => i.id === itemId);
        if (item) {
            showDescriptionModal(`Descrição de "${item.name}"`, fullDescription || 'Este item não possui uma descrição detalhada.');
        }
    }
});

// Listener para o botão de "Confirmar" do modal de confirmação
confirmActionButton.addEventListener('click', executeConfirmation);

// Permite fechar modais clicando fora (no overlay)
descriptionModal.addEventListener('click', (event) => {
    if (event.target === descriptionModal) {
        closeDescriptionModal();
    }
});

confirmationModal.addEventListener('click', (event) => {
    if (event.target === confirmationModal) {
        cancelConfirmation(); // Trata o clique no overlay como cancelamento
    }
});

historyModal.addEventListener('click', (event) => {
    if (event.target === historyModal) {
        closeHistoryModal();
    }
});

// Lógica para adicionar movimento no modal de histórico
addMovementBtn.addEventListener('click', addMovement);

// Alterar limite de baixo estoque
lowStockThresholdInput.addEventListener('change', () => {
    updateStockSummary();
    renderItems(); // Re-renderiza para aplicar destaque de baixo estoque
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

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    loadDarkModePreference(); // Carrega a preferência de modo escuro
    // Carrega o limite de baixo estoque salvo no LocalStorage
    const savedLowStockThreshold = localStorage.getItem('lowStockThreshold');
    if (savedLowStockThreshold !== null) {
        lowStockThresholdInput.value = parseInt(savedLowStockThreshold);
    }
    renderItems(); // Renderiza os itens existentes ao carregar a página
    // Garante que os inputs file limpem seus valores ao carregar, evitando problemas de cache do navegador
    itemImageInput.value = '';
    importFileInput.value = '';

    // Inicializa o estado do botão de limpar busca
    clearSearchBtn.style.display = searchTermInput.value.trim() !== '' ? 'inline-flex' : 'none';
});