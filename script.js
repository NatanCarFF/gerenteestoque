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
        historyListBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Nenhum histórico para este item.</td></tr>`;
    } else {
        noHistoryMessage.classList.add('hidden');
        history.forEach((movement, index) => {
            const row = historyListBody.insertRow();
            const dateFormatted = new Date(movement.date).toLocaleDateString('pt-BR') + ' ' +
                                 new Date(movement.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            row.innerHTML = `
                <td>${movement.type === 'entry' ? 'Entrada' : 'Saída'}</td>
                <td class="${movement.type === 'entry' ? 'text-success' : 'text-danger'}">${movement.quantity}</td>
                <td>${dateFormatted}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="showConfirmationModal('Tem certeza que deseja remover este movimento?', () => deleteMovement('${itemId}', ${index}))"><i class="fas fa-times-circle"></i></button>
                </td>
            `;
        });
    }
}


// --- Funções Principais de CRUD e Lógica de Negócio ---

/**
 * Adiciona ou edita um item no estoque.
 * @param {Event} event - O evento de submit do formulário.
 */
itemForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Impede o recarregamento da página

    // Validação básica
    if (!itemNameInput.value.trim()) {
        showNotification("Por favor, preencha o nome do item.", "warning");
        itemNameInput.focus();
        return;
    }
    if (itemQuantityInput.value < 0) {
        showNotification("A quantidade não pode ser negativa.", "warning");
        itemQuantityInput.focus();
        return;
    }
    if (itemPurchasePriceInput.value < 0 || itemSalePriceInput.value < 0) {
        showNotification("Os preços não podem ser negativos.", "warning");
        itemPurchasePriceInput.focus();
        return;
    }
    if (parseFloat(itemSalePriceInput.value) < parseFloat(itemPurchasePriceInput.value)) {
        showNotification("O preço de venda não pode ser menor que o preço de compra.", "warning");
        itemSalePriceInput.focus();
        return;
    }

    const items = loadItems();
    const isEditing = editingItemId !== null;

    // Verifica se o nome do item já existe (apenas para novos itens ou se o nome foi alterado durante a edição)
    const existingItem = items.find(item => item.name.toLowerCase() === itemNameInput.value.trim().toLowerCase() && item.id !== editingItemId);
    if (existingItem) {
        showNotification("Já existe um item com este nome. Por favor, escolha um nome diferente.", "error");
        itemNameInput.focus();
        return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
        const newItem = {
            id: isEditing ? editingItemId : Date.now().toString(), // Usa o ID existente ou gera um novo
            image: reader.result, // Base64 da imagem
            name: itemNameInput.value.trim(),
            description: itemDescriptionInput.value.trim(),
            quantity: parseInt(itemQuantityInput.value),
            purchasePrice: parseFloat(itemPurchasePriceInput.value).toFixed(2), // Garante 2 casas decimais
            salePrice: parseFloat(itemSalePriceInput.value).toFixed(2),     // Garante 2 casas decimais
            supplier: itemSupplierInput.value.trim(),
            registeredAt: isEditing ? items.find(item => item.id === editingItemId).registeredAt : new Date().toISOString() // Mantém a data de registro original ou cria uma nova
        };

        if (isEditing) {
            const itemIndex = items.findIndex(item => item.id === editingItemId);
            if (itemIndex > -1) {
                items[itemIndex] = newItem;
                showNotification("Item atualizado com sucesso!", "success");
            }
        } else {
            items.push(newItem);
            showNotification("Item cadastrado com sucesso!", "success");
        }

        saveItems(items);
        clearForm(); // Limpa o formulário após salvar
    };

    if (itemImageInput.files.length > 0) {
        reader.readAsDataURL(itemImageInput.files[0]);
    } else {
        // Se não houver imagem, usa a imagem existente se estiver editando, ou null para novo item
        reader.onloadend(); // Chama onloadend diretamente para continuar o processo
    }
});

// Pré-visualização da imagem
itemImageInput.addEventListener('change', (event) => {
    if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
        };
        reader.readAsDataURL(event.target.files[0]);
    } else {
        previewImage.src = '';
        previewImage.classList.add('hidden');
        noImageText.classList.remove('hidden');
    }
});

/**
 * Preenche o formulário com os dados do item para edição.
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

        // Exibir imagem de pré-visualização, se houver
        if (itemToEdit.image) {
            previewImage.src = itemToEdit.image;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
        } else {
            previewImage.src = '';
            previewImage.classList.add('hidden');
            noImageText.classList.remove('hidden');
        }

        // Altera o texto e exibe o botão de cancelar
        saveItemBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Item';
        cancelEditBtn.style.display = 'inline-flex';

        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo da página
    } else {
        showNotification("Item não encontrado para edição.", "error");
    }
}

/**
 * Deleta um item do estoque. Esta função é chamada após a confirmação.
 * @param {string} id - O ID do item a ser deletado.
 */
function deleteItemConfirmed(id) {
    let items = loadItems();
    const initialLength = items.length;
    items = items.filter(item => item.id !== id);

    if (items.length < initialLength) {
        saveItems(items);
        // Remove o histórico de movimentação para o item excluído
        let allHistory = JSON.parse(localStorage.getItem('movementHistory')) || {};
        delete allHistory[id];
        localStorage.setItem('movementHistory', JSON.stringify(allHistory));

        showNotification("Item excluído com sucesso!", "success");
    } else {
        showNotification("Erro ao excluir item. Item não encontrado.", "error");
    }
    closeConfirmationModal(); // Fecha o modal de confirmação
}

/**
 * Cancela a edição de um item e limpa o formulário.
 */
cancelEditBtn.addEventListener('click', clearForm);


// --- Funcionalidades de Busca e Limpeza ---
searchTermInput.addEventListener('input', renderItems); // Renderiza ao digitar
clearSearchBtn.addEventListener('click', () => {
    searchTermInput.value = '';
    clearSearchBtn.style.display = 'none'; // Esconde o botão novamente
    renderItems();
});

// Mostra/esconde o botão de limpar busca
searchTermInput.addEventListener('keyup', () => {
    if (searchTermInput.value.length > 0) {
        clearSearchBtn.style.display = 'inline-flex';
    } else {
        clearSearchBtn.style.display = 'none';
    }
});


// --- Funcionalidades de Importação e Exportação ---

/**
 * Exporta os dados do estoque para um arquivo JSON.
 */
exportDataBtn.addEventListener('click', () => {
    const items = loadItems();
    const history = JSON.parse(localStorage.getItem('movementHistory')) || {};
    const dataToExport = {
        stockItems: items,
        movementHistory: history,
        lowStockThreshold: localStorage.getItem('lowStockThreshold') || '0',
        darkModePreference: localStorage.getItem('darkMode') || 'false'
    };

    const dataStr = JSON.stringify(dataToExport, null, 2); // Formata com 2 espaços
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estoque_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Dados exportados com sucesso para 'estoque_backup.json'!", "success");
});

/**
 * Importa dados de um arquivo JSON.
 */
importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (file.type !== 'application/json') {
        showNotification("Por favor, selecione um arquivo JSON válido.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            if (importedData.stockItems && Array.isArray(importedData.stockItems)) {
                // Pedir confirmação antes de sobrescrever
                showConfirmationModal(
                    'Importar dados irá substituir todos os itens e histórico existentes. Deseja continuar?',
                    () => {
                        localStorage.setItem('stockItems', JSON.stringify(importedData.stockItems));
                        if (importedData.movementHistory) {
                            localStorage.setItem('movementHistory', JSON.stringify(importedData.movementHistory));
                        } else {
                            localStorage.removeItem('movementHistory'); // Limpa se não houver histórico importado
                        }
                        if (importedData.lowStockThreshold) {
                            localStorage.setItem('lowStockThreshold', importedData.lowStockThreshold);
                        }
                        if (importedData.darkModePreference) {
                            localStorage.setItem('darkMode', importedData.darkModePreference);
                            loadDarkModePreference(); // Aplica a preferência importada
                        }

                        renderItems();
                        updateStockSummary();
                        showNotification("Dados importados com sucesso!", "success");
                        closeConfirmationModal();
                    }
                );
            } else {
                showNotification("O arquivo JSON não parece conter dados de estoque válidos.", "error");
            }
        } catch (error) {
            console.error("Erro ao ler ou parsear o arquivo JSON:", error);
            showNotification("Erro ao importar o arquivo. Verifique se é um JSON válido.", "error");
        } finally {
            importFileInput.value = ''; // Limpa o input file para permitir nova seleção
        }
    };
    reader.readAsText(file);
});


// --- Funcionalidades de Modais ---

/**
 * Abre o modal de descrição com o texto completo.
 * @param {string} title - Título do item.
 * @param {string} description - Descrição completa do item.
 */
function openDescriptionModal(title, description) {
    descriptionModalTitle.textContent = title;
    descriptionModalText.textContent = description || 'N/A';
    descriptionModal.style.display = 'block';
    descriptionModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open'); // Para prevenir scroll do body
}

/**
 * Fecha o modal de descrição.
 */
function closeDescriptionModal() {
    descriptionModal.style.display = 'none';
    descriptionModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
}

// Fechar modal de descrição ao clicar fora ou no botão
descriptionModal.addEventListener('click', (event) => {
    if (event.target === descriptionModal) {
        closeDescriptionModal();
    }
});

/**
 * Exibe o modal de confirmação.
 * @param {string} message - A mensagem de confirmação.
 * @param {Function} callback - A função a ser executada se o usuário confirmar.
 * @param {string} [title='Confirmação'] - Título do modal.
 */
function showConfirmationModal(message, callback, title = 'Confirmação') {
    confirmationModalTitle.textContent = title;
    confirmationModalText.innerHTML = message; // Usar innerHTML para permitir entidades HTML como &quot;
    confirmationCallback = callback; // Armazena a função de callback
    confirmationModal.style.display = 'block';
    confirmationModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
}

/**
 * Fecha o modal de confirmação.
 */
function closeConfirmationModal() {
    confirmationModal.style.display = 'none';
    confirmationModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    confirmationCallback = null; // Limpa o callback
}

// Listener para o botão de ação no modal de confirmação
confirmActionButton.addEventListener('click', () => {
    if (confirmationCallback) {
        confirmationCallback(); // Executa a função de callback
    }
    // O modal é fechado pela função de callback ou uma ação específica após o callback
    // closeConfirmationModal(); // Pode ser chamado aqui ou dentro do callback, dependendo do fluxo
});

// Fechar modal de confirmação ao clicar no "Não" ou fora
confirmationModal.addEventListener('click', (event) => {
    if (event.target === confirmationModal || event.target.classList.contains('btn-secondary')) {
        closeConfirmationModal();
    }
});


/**
 * Abre o modal de histórico de movimentação.
 * @param {string} itemId - O ID do item cujo histórico será exibido.
 */
function showHistoryModal(itemId) {
    const items = loadItems();
    const item = items.find(i => i.id === itemId);

    if (item) {
        historyModal.dataset.itemId = itemId; // Armazena o ID do item no modal
        historyModalTitle.textContent = `Histórico de Movimentação - ${item.name}`;
        historyItemName.textContent = item.name; // Exibe o nome do item no formulário do modal
        renderHistory(itemId); // Carrega e renderiza o histórico
        historyModal.style.display = 'block';
        historyModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    } else {
        showNotification("Item não encontrado para visualizar histórico.", "error");
    }
}

/**
 * Fecha o modal de histórico.
 */
function closeHistoryModal() {
    historyModal.style.display = 'none';
    historyModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    historyModal.removeAttribute('dataset.itemId'); // Limpa o ID do item
    // Limpa os campos do formulário de movimento
    movementTypeSelect.value = 'entry';
    movementQuantityInput.value = '1';
}

// Fechar modal de histórico ao clicar fora
historyModal.addEventListener('click', (event) => {
    if (event.target === historyModal) {
        closeHistoryModal();
    }
});

/**
 * Adiciona uma nova movimentação ao histórico do item.
 */
addMovementBtn.addEventListener('click', () => {
    const itemId = historyModal.dataset.itemId;
    const type = movementTypeSelect.value;
    const quantity = parseInt(movementQuantityInput.value);

    if (!itemId) {
        showNotification("Erro: Item ID não encontrado para adicionar movimento.", "error");
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        showNotification("Por favor, insira uma quantidade válida maior que zero.", "warning");
        movementQuantityInput.focus();
        return;
    }

    let items = loadItems();
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
        showNotification("Item não encontrado no estoque.", "error");
        return;
    }

    const item = items[itemIndex];
    let newQuantity = item.quantity;
    let success = false;
    let notificationMessage = "";

    if (type === 'entry') {
        newQuantity += quantity;
        notificationMessage = `Entrada de ${quantity} unidades para "${item.name}" registrada.`;
        success = true;
    } else if (type === 'exit') {
        if (newQuantity >= quantity) {
            newQuantity -= quantity;
            notificationMessage = `Saída de ${quantity} unidades para "${item.name}" registrada.`;
            success = true;
        } else {
            showNotification(`Não há estoque suficiente (${item.quantity}) para registrar a saída de ${quantity} unidades de "${item.name}".`, "error");
        }
    }

    if (success) {
        item.quantity = newQuantity;
        items[itemIndex] = item;
        saveItems(items); // Salva os itens atualizados

        // Adiciona ao histórico de movimentações
        const history = loadMovementHistory(itemId);
        history.push({
            type: type,
            quantity: quantity,
            date: new Date().toISOString()
        });
        saveMovementHistory(itemId, history); // Salva o histórico

        renderHistory(itemId); // Atualiza a tabela de histórico no modal
        showNotification(notificationMessage, "success");
        // Limpa o campo de quantidade após a adição bem-sucedida
        movementQuantityInput.value = '1';
    }
});

/**
 * Deleta um movimento específico do histórico de um item.
 * @param {string} itemId - O ID do item.
 * @param {number} movementIndex - O índice do movimento a ser deletado no array de histórico.
 */
function deleteMovement(itemId, movementIndex) {
    let history = loadMovementHistory(itemId);
    if (movementIndex >= 0 && movementIndex < history.length) {
        const deletedMovement = history[movementIndex];
        history.splice(movementIndex, 1); // Remove o movimento do array
        saveMovementHistory(itemId, history); // Salva o histórico atualizado

        // Reverte a quantidade do item no estoque
        let items = loadItems();
        const itemIndex = items.findIndex(item => item.id === itemId);
        if (itemIndex > -1) {
            if (deletedMovement.type === 'entry') {
                items[itemIndex].quantity -= deletedMovement.quantity;
            } else if (deletedMovement.type === 'exit') {
                items[itemIndex].quantity += deletedMovement.quantity;
            }
            saveItems(items); // Salva os itens com a quantidade revertida
        }
        renderHistory(itemId); // Re-renderiza o histórico
        showNotification("Movimento excluído com sucesso!", "success");
    } else {
        showNotification("Erro: Movimento não encontrado.", "error");
    }
    closeConfirmationModal(); // Fecha o modal de confirmação
}


// --- Paginação ---
itemsPerPageSelect.addEventListener('change', (event) => {
    itemsPerPage = parseInt(event.target.value);
    currentPage = 1; // Reseta para a primeira página ao mudar itens por página
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


// --- Ordenação da Tabela ---
document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
        const column = header.dataset.sort;
        if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = column;
            currentSortDirection = 'asc'; // Padrão asc quando muda de coluna
        }

        // Remove ícones de todas as colunas
        document.querySelectorAll('.sortable i').forEach(icon => icon.remove());

        // Adiciona ícone à coluna atual
        const icon = document.createElement('i');
        icon.classList.add('fas', currentSortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
        header.appendChild(icon);

        renderItems();
    });
});


// --- Modo Escuro ---

/**
 * Carrega a preferência de modo escuro do LocalStorage.
 */
function loadDarkModePreference() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Ícone de sol
    } else {
        document.body.classList.remove('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Ícone de lua
    }
}

/**
 * Alterna entre o modo claro e escuro.
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode); // Salva a preferência
    darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Low Stock Threshold
lowStockThresholdInput.addEventListener('change', () => {
    updateStockSummary(); // Atualiza o resumo quando o limite muda
    renderItems(); // Re-renderiza para aplicar a coloração de baixo estoque
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
    clearSearchBtn.style.display = searchTermInput.value.length > 0 ? 'inline-flex' : 'none';
});