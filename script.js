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

    const isFilteredOrSearched = searchTerm !== "" || showLowStockItemsBtn.classList.contains('active');
    toggleTableVisibility(itemsToDisplay, isFilteredOrSearched);

    if (itemsToDisplay.length === 0) {
        if (isFilteredOrSearched) {
            itemListBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Nenhum item corresponde aos critérios de busca ou filtro.</td></tr>`;
        } else {
            itemListBody.innerHTML = '';
        }
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

        saveItemBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Item';
        cancelEditBtn.style.display = 'inline-block'; // Mostra o botão de cancelar
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo do formulário
        itemNameInput.focus(); // Coloca o foco no nome do item
    } else {
        showNotification('Item não encontrado para edição.', 'error');
    }
}

/**
 * Confirma a exclusão de um item após a confirmação do modal.
 * @param {string} id - O ID do item a ser excluído.
 */
function deleteItemConfirmed(id) {
    let items = loadItems();
    const initialLength = items.length;
    items = items.filter(item => item.id !== id);

    if (items.length < initialLength) {
        saveItems(items);
        // Também remove o histórico de movimentação associado a este item
        const allHistory = JSON.parse(localStorage.getItem('movementHistory')) || {};
        delete allHistory[id];
        localStorage.setItem('movementHistory', JSON.stringify(allHistory));

        showNotification('Item excluído com sucesso!', 'success');
        closeConfirmationModal(); // Fecha o modal de confirmação
    } else {
        showNotification('Erro ao excluir item. Item não encontrado.', 'error');
    }
}


/**
 * Adiciona um movimento (entrada/saída) ao histórico de um item.
 * @param {string} itemId - O ID do item.
 */
function addMovement(itemId) {
    const type = movementTypeSelect.value;
    const quantity = parseInt(movementQuantityInput.value);

    if (isNaN(quantity) || quantity <= 0) {
        showNotification("A quantidade deve ser um número positivo.", "error");
        return;
    }

    let items = loadItems();
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex > -1) {
        const item = items[itemIndex];
        let newQuantity = item.quantity;
        let notificationMessage = '';
        let notificationType = 'success';

        if (type === 'entrada') {
            newQuantity += quantity;
            notificationMessage = `Entrada de ${quantity} unidades para "${item.name}" registrada.`;
        } else if (type === 'saida') {
            if (newQuantity >= quantity) {
                newQuantity -= quantity;
                notificationMessage = `Saída de ${quantity} unidades para "${item.name}" registrada.`;
            } else {
                showNotification(`Não há ${quantity} unidades de "${item.name}" em estoque. Quantidade atual: ${newQuantity}.`, "error");
                return; // Impede a movimentação se não houver estoque suficiente
            }
        }

        item.quantity = newQuantity;
        saveItems(items); // Salva a nova quantidade do item

        // Salva o movimento no histórico
        const history = loadMovementHistory(itemId);
        history.push({
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
            type: type,
            quantity: quantity,
            date: new Date().toISOString()
        });
        saveMovementHistory(itemId, history); // Salva o histórico atualizado

        renderHistory(itemId); // Atualiza a lista de histórico no modal
        updateStockSummary(); // Atualiza o resumo do estoque
        showNotification(notificationMessage, notificationType);
        movementQuantityInput.value = 1; // Reseta a quantidade para 1
    } else {
        showNotification("Item não encontrado para registrar movimentação.", "error");
    }
}

/**
 * Confirma a exclusão de um movimento de histórico após a confirmação do modal.
 * @param {string} itemId - O ID do item.
 * @param {string} movementId - O ID do movimento a ser excluído.
 */
function deleteMovementConfirmed(itemId, movementId) {
    let items = loadItems();
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
        showNotification("Item não encontrado para remover movimento.", "error");
        closeConfirmationModal();
        return;
    }

    const item = items[itemIndex];
    let history = loadMovementHistory(itemId);
    const movementIndex = history.findIndex(mov => mov.id === movementId);

    if (movementIndex > -1) {
        const movement = history[movementIndex];
        // Reverte a quantidade do item
        if (movement.type === 'entrada') {
            item.quantity -= movement.quantity;
        } else { // tipo 'saida'
            item.quantity += movement.quantity;
        }

        // Garante que a quantidade não seja negativa
        if (item.quantity < 0) item.quantity = 0;

        history.splice(movementIndex, 1); // Remove o movimento do histórico

        saveMovementHistory(itemId, history); // Salva o histórico atualizado
        saveItems(items); // Salva a quantidade revertida do item

        renderHistory(itemId); // Re-renderiza o histórico no modal
        showNotification('Movimento removido com sucesso!', 'success');
        closeConfirmationModal();
    } else {
        showNotification('Movimento não encontrado.', 'error');
    }
}

// --- Funções de Modal ---

/**
 * Abre o modal de descrição com o texto completo.
 * @param {string} id - O ID do item cuja descrição será exibida.
 */
function showDescriptionModal(id) {
    const items = loadItems();
    const item = items.find(item => item.id === id);
    if (item && item.description) {
        descriptionModalTitle.textContent = `Descrição de: ${item.name}`;
        descriptionModalText.textContent = item.description;
        descriptionModal.classList.add('active');
    } else {
        showNotification('Descrição não disponível para este item.', 'info');
    }
}

/**
 * Fecha o modal de descrição.
 */
function closeDescriptionModal() {
    descriptionModal.classList.remove('active');
}

/**
 * Abre o modal de confirmação.
 * @param {string} message - A mensagem a ser exibida no modal.
 * @param {function} callback - A função a ser executada se o usuário confirmar.
 * @param {string} title - O título do modal de confirmação (opcional).
 * @param {string} confirmButtonText - O texto do botão de confirmação (opcional).
 */
function showConfirmationModal(message, callback, title = 'Confirmação', confirmButtonText = 'Confirmar') {
    confirmationModalTitle.textContent = title;
    confirmationModalText.textContent = message;
    confirmActionButton.textContent = confirmButtonText;
    confirmationCallback = callback; // Armazena a função de callback
    confirmationModal.classList.add('active');
}

/**
 * Fecha o modal de confirmação e reseta o callback.
 */
function closeConfirmationModal() {
    confirmationModal.classList.remove('active');
    confirmationCallback = null; // Limpa o callback para evitar execuções indesejadas
}

/**
 * Cancela a ação de confirmação.
 */
function cancelConfirmation() {
    closeConfirmationModal();
    showNotification('Ação cancelada.', 'info');
}

/**
 * Executa o callback de confirmação e fecha o modal.
 */
confirmActionButton.addEventListener('click', () => {
    if (confirmationCallback) {
        confirmationCallback(); // Executa a função armazenada
    }
});

/**
 * Abre o modal de histórico de movimentação para um item.
 * @param {string} id - O ID do item para o qual o histórico será exibido.
 */
function showHistoryModal(id) {
    const items = loadItems();
    const item = items.find(item => item.id === id);

    if (item) {
        historyModalTitle.dataset.itemId = id; // Armazena o ID do item no título do modal
        historyItemName.textContent = item.name; // Exibe o nome do item no título
        renderHistory(id);
        historyModal.classList.add('active');
    } else {
        showNotification('Item não encontrado para visualizar histórico.', 'error');
    }
}

/**
 * Fecha o modal de histórico.
 */
function closeHistoryModal() {
    historyModal.classList.remove('active');
    movementQuantityInput.value = 1; // Reseta a quantidade para 1 ao fechar
    movementTypeSelect.value = 'entrada'; // Reseta o tipo de movimento
}


// --- Exportar/Importar Dados ---

/**
 * Exporta os dados de estoque e histórico para um arquivo JSON.
 */
function exportData() {
    const data = {
        stockItems: loadItems(),
        movementHistory: JSON.parse(localStorage.getItem('movementHistory')) || {},
        lowStockThreshold: localStorage.getItem('lowStockThreshold') || '5',
        darkModeEnabled: localStorage.getItem('darkModeEnabled') || 'false'
    };
    const dataStr = JSON.stringify(data, null, 4); // Formata com 4 espaços para legibilidade
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
}

/**
 * Importa dados de um arquivo JSON.
 */
function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        showNotification('Nenhum arquivo selecionado para importação.', 'info');
        return;
    }

    if (file.type !== 'application/json') {
        showNotification('Por favor, selecione um arquivo JSON válido.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            if (importedData.stockItems && Array.isArray(importedData.stockItems)) {
                localStorage.setItem('stockItems', JSON.stringify(importedData.stockItems));
            } else {
                showNotification('O arquivo JSON não contém uma estrutura válida de "stockItems".', 'error');
                return;
            }

            if (importedData.movementHistory && typeof importedData.movementHistory === 'object') {
                localStorage.setItem('movementHistory', JSON.stringify(importedData.movementHistory));
            } else {
                showNotification('O arquivo JSON não contém uma estrutura válida de "movementHistory".', 'error');
                return;
            }

            if (importedData.lowStockThreshold !== undefined) {
                localStorage.setItem('lowStockThreshold', importedData.lowStockThreshold.toString());
            }

            if (importedData.darkModeEnabled !== undefined) {
                localStorage.setItem('darkModeEnabled', importedData.darkModeEnabled.toString());
                loadDarkModePreference(); // Aplica a preferência importada
            }

            showNotification('Dados importados e carregados com sucesso!', 'success');
            clearForm();
            searchTermInput.value = ''; // Limpa o campo de busca
            currentPage = 1; // Volta para a primeira página
            renderItems();
            updateStockSummary();
            // Garante que o input file limpe seu valor após a importação para permitir re-importar o mesmo arquivo
            importFileInput.value = '';
        } catch (error) {
            console.error("Erro ao importar dados:", error);
            showNotification('Erro ao processar o arquivo JSON. Verifique o formato.', 'error');
            importFileInput.value = ''; // Limpa o input file em caso de erro
        }
    };
    reader.onerror = () => {
        showNotification('Erro ao ler o arquivo.', 'error');
        importFileInput.value = ''; // Limpa o input file em caso de erro
    };
    reader.readAsText(file);
}


// --- Tema Escuro ---

/**
 * Alterna entre o modo claro e escuro.
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkModeEnabled', isDarkMode);
    // Atualiza o ícone do botão
    darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    darkModeToggle.title = isDarkMode ? 'Alternar Modo Claro' : 'Alternar Modo Escuro';
}

/**
 * Carrega a preferência de modo escuro do LocalStorage.
 */
function loadDarkModePreference() {
    const isDarkMode = localStorage.getItem('darkModeEnabled') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        darkModeToggle.title = 'Alternar Modo Claro';
    } else {
        document.body.classList.remove('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        darkModeToggle.title = 'Alternar Modo Escuro';
    }
}

// --- Animações ---
function applySaveAnimation() {
    saveItemBtn.classList.add('saved');
    saveItemBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    setTimeout(() => {
        if (!editingItemId) { // Só volta ao normal se não estiver em modo de edição
            saveItemBtn.classList.remove('saved');
            saveItemBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Item';
        }
    }, 2000);
}


// --- Listeners de Eventos ---
itemForm.addEventListener('submit', addItem);
cancelEditBtn.addEventListener('click', clearForm); // Botão Cancelar Edição

// Pré-visualização da imagem
itemImageInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        previewImage.src = '';
        previewImage.classList.add('hidden');
        noImageText.classList.remove('hidden');
    }
});

// Listener para mostrar descrição completa ao clicar na célula
itemListBody.addEventListener('click', (event) => {
    const targetCell = event.target.closest('.description-cell');
    if (targetCell) {
        const itemId = targetCell.dataset.itemId;
        showDescriptionModal(itemId);
    }
});


// Busca de itens
searchTermInput.addEventListener('input', () => {
    currentPage = 1; // Reseta para a primeira página ao buscar
    renderItems();
    clearSearchBtn.style.display = searchTermInput.value.trim() !== '' ? 'block' : 'none'; // Mostra/esconde o botão de limpar
});

clearSearchBtn.addEventListener('click', () => {
    searchTermInput.value = '';
    clearSearchBtn.style.display = 'none';
    currentPage = 1;
    renderItems();
});

// Exportar/Importar
exportDataBtn.addEventListener('click', exportData);
importFileInput.addEventListener('change', importData);

// Paginação
itemsPerPageSelect.addEventListener('change', () => {
    itemsPerPage = itemsPerPageSelect.value === 'all' ? 'all' : parseInt(itemsPerPageSelect.value);
    currentPage = 1; // Volta para a primeira página ao mudar itens por página
    renderItems();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderItems();
    }
});

nextPageBtn.addEventListener('click', () => {
    let items = loadItems();
    // Re-aplica filtros para calcular totalPages corretamente para navegação
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

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredItems.length / itemsPerPage);

    if (currentPage < totalPages) {
        currentPage++;
        renderItems();
    }
});

// Movimentação de estoque no modal de histórico
addMovementBtn.addEventListener('click', () => {
    const itemId = historyModalTitle.dataset.itemId;
    if (itemId) {
        addMovement(itemId);
    } else {
        showNotification("Erro: ID do item não encontrado para adicionar movimento.", "error");
    }
});

// Atualiza o resumo do estoque quando o limite de baixo estoque é alterado
lowStockThresholdInput.addEventListener('change', updateStockSummary);
lowStockThresholdInput.addEventListener('input', updateStockSummary); // Para atualizar em tempo real ao digitar

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
    clearSearchBtn.style.display = searchTermInput.value.trim() !== '' ? 'block' : 'none';

    // Adiciona listener para as colunas de ordenação
    document.querySelectorAll('.item-table th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (currentSortColumn === column) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortDirection = 'asc';
            }
            // Remove ícones de ordenação de todos os cabeçalhos
            document.querySelectorAll('.item-table th i.fas.fa-sort, .item-table th i.fas.fa-sort-up, .item-table th i.fas.fa-sort-down').forEach(icon => {
                icon.remove();
            });
            // Adiciona o novo ícone de ordenação
            const sortIcon = document.createElement('i');
            sortIcon.classList.add('fas', currentSortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
            header.appendChild(sortIcon);
            renderItems();
        });
    });

    // Função para adicionar o botão de limpar tudo no footer
    function addClearAllDataButton() {
        const footer = document.querySelector('.footer');
        if (footer) {
            const clearAllButton = document.createElement('button');
            clearAllButton.id = 'clearAllDataBtn';
            clearAllButton.classList.add('btn', 'btn-danger', 'btn-clear-all');
            clearAllButton.innerHTML = '<i class="fas fa-eraser"></i> Limpar Tudo';
            clearAllButton.title = 'Apagar todos os dados do estoque e histórico';
            clearAllButton.addEventListener('click', clearAllData);
            footer.appendChild(clearAllButton);
        }
    }
    addClearAllDataButton();
});


/**
 * Limpa todos os dados do LocalStorage relacionados ao estoque e histórico,
 * e reinicia a visualização da página.
 */
function clearAllData() {
    showConfirmationModal('Tem certeza que deseja APAGAR TODOS os dados do estoque e histórico? Esta ação é irreversível!', () => {
        localStorage.removeItem('stockItems');
        localStorage.removeItem('movementHistory');
        localStorage.removeItem('lowStockThreshold'); // Também limpa o threshold
        showNotification('Todos os dados foram apagados com sucesso!', 'success');
        clearForm();
        searchTermInput.value = ''; // Limpa o campo de busca
        currentPage = 1; // Volta para a primeira página
        itemsPerPageSelect.value = '10'; // Reseta para 10 itens por página
        itemsPerPage = 10;
        showLowStockItemsBtn.classList.remove('active'); // Desativa o filtro de baixo estoque
        showLowStockItemsBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ver Baixo Estoque';
        renderItems();
        updateStockSummary();
        clearSearchBtn.style.display = 'none'; // Esconde o botão de limpar busca
    }, 'Confirmar Limpeza Total', 'Limpar Tudo'); // Adiciona título e texto do botão de confirmação
}