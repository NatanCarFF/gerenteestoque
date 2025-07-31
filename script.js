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
const saveItemBtn = itemForm.querySelector('.btn-primary'); // O botão de submit do form
const cancelEditBtn = document.getElementById('cancelEditBtn');

const searchTermInput = document.getElementById('searchTerm');
const exportDataBtn = document.getElementById('exportData');
const importFileInput = document.getElementById('importFile');

const itemListBody = document.getElementById('itemList'); // tbody da tabela
const itemTable = document.getElementById('itemTable');
const noItemsMessage = document.getElementById('noItemsMessage');
const notificationContainer = document.getElementById('notification-container'); // Contêiner de notificações

let editingItemId = null; // Variável para controlar se estamos editando um item existente

// --- Funções Auxiliares ---

/**
 * Exibe uma notificação temporária no canto superior direito da tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success', 'error', 'info').
 * @param {number} duration - Duração em milissegundos para a notificação permanecer.
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.classList.add('notification', type);

    let iconClass = '';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-triangle';
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
    } catch (e) {
        console.error("Erro ao salvar itens no LocalStorage:", e);
        showNotification("Erro ao salvar dados do estoque. O armazenamento pode estar cheio ou inacessível.", "error");
    }
}

/**
 * Exibe ou esconde a tabela e a mensagem "nenhum item".
 */
function toggleTableVisibility() {
    const items = loadItems();
    // Verifica se há itens após a filtragem para exibição
    const searchTerm = searchTermInput.value.toLowerCase().trim();
    const filteredItems = items.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
               item.description.toLowerCase().includes(searchTerm) ||
               item.supplier.toLowerCase().includes(searchTerm);
    });

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
 * Limpa o formulário após adicionar/editar um item.
 */
function clearForm() {
    itemForm.reset(); // Reseta todos os campos do formulário
    itemImageInput.value = ''; // Garante que o input file também seja limpo
    previewImage.src = '';
    previewImage.classList.add('hidden');
    noImageText.classList.remove('hidden');
    editingItemId = null; // Reseta o ID de edição
    saveItemBtn.textContent = 'Salvar Item'; // Volta o texto do botão
    saveItemBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Item'; // Adiciona o ícone novamente
    cancelEditBtn.style.display = 'none'; // Esconde o botão de cancelar
}

/**
 * Renderiza a lista de itens na tabela.
 */
function renderItems() {
    itemListBody.innerHTML = ''; // Limpa a tabela antes de renderizar
    const items = loadItems();

    // Aplica o filtro de busca
    const searchTerm = searchTermInput.value.toLowerCase().trim();
    const filteredItems = items.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
               item.description.toLowerCase().includes(searchTerm) ||
               item.supplier.toLowerCase().includes(searchTerm);
    });

    toggleTableVisibility(); // Atualiza a visibilidade da tabela/mensagem

    if (filteredItems.length === 0 && searchTerm !== "") {
        // Já tratado em toggleTableVisibility. Se quiser uma linha na tabela:
        itemListBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Nenhum item encontrado para "${searchTerm}".</td></tr>`;
        return;
    } else if (filteredItems.length === 0 && searchTerm === "") {
        // Já tratado em toggleTableVisibility. Não precisa de nada aqui.
        return;
    }


    filteredItems.forEach(item => {
        const row = itemListBody.insertRow();
        row.dataset.id = item.id; // Armazena o ID no dataset da linha

        // Formatação de moeda para preços
        const purchasePriceFormatted = parseFloat(item.purchasePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const salePriceFormatted = parseFloat(item.salePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        row.innerHTML = `
            <td><img src="${item.image || 'assets/images/placeholder.png'}" alt="${item.name}" loading="lazy"></td>
            <td>${item.id.substring(0, 8)}...</td> <td>${item.name}</td>
            <td class="description-cell">${item.description}</td>
            <td>${item.quantity}</td>
            <td>${purchasePriceFormatted}</td>
            <td>${salePriceFormatted}</td>
            <td>${item.supplier}</td>
            <td>${new Date(item.registeredAt).toLocaleDateString('pt-BR')}</td>
            <td>
                <button class="btn btn-info btn-action" onclick="editItem('${item.id}')" title="Editar Item"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-action" onclick="deleteItem('${item.id}')" title="Excluir Item"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
    });
}

// --- Funções de CRUD ---

/**
 * Adiciona um novo item ou atualiza um item existente.
 * @param {Event} event - O evento de submit do formulário.
 */
async function addItem(event) {
    event.preventDefault(); // Impede o recarregamento da página

    // --- Validação Básica ---
    if (!itemNameInput.value.trim()) {
        showNotification("O nome do item é obrigatório.", "error");
        itemNameInput.focus();
        return;
    }
    if (isNaN(parseInt(itemQuantityInput.value)) || parseInt(itemQuantityInput.value) < 0) {
        showNotification("A quantidade deve ser um número válido e não negativo.", "error");
        itemQuantityInput.focus();
        return;
    }
    if (isNaN(parseFloat(itemPurchasePriceInput.value)) || parseFloat(itemPurchasePriceInput.value) < 0) {
        showNotification("O preço de compra deve ser um número válido e não negativo.", "error");
        itemPurchasePriceInput.focus();
        return;
    }
    if (isNaN(parseFloat(itemSalePriceInput.value)) || parseFloat(itemSalePriceInput.value) < 0) {
        showNotification("O preço de venda deve ser um número válido e não negativo.", "error");
        itemSalePriceInput.focus();
        return;
    }
    if (parseFloat(itemSalePriceInput.value) < parseFloat(itemPurchasePriceInput.value)) {
        showNotification("O preço de venda não pode ser menor que o preço de compra.", "error");
        itemSalePriceInput.focus();
        return;
    }


    const imageFile = itemImageInput.files[0];
    let imageDataUrl = '';

    // Se uma nova imagem foi selecionada
    if (imageFile) {
        // Limite de tamanho da imagem (ex: 1MB) para evitar sobrecarregar o localStorage
        const MAX_IMAGE_SIZE_MB = 1;
        if (imageFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            showNotification(`A imagem é muito grande. Tamanho máximo permitido: ${MAX_IMAGE_SIZE_MB}MB.`, "error");
            itemImageInput.value = ''; // Limpa o input file
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
            return; // Impede que o item seja salvo sem a imagem
        }
    } else if (editingItemId) {
        // Se estiver editando e nenhuma nova imagem foi selecionada, mantém a imagem existente
        const existingItem = loadItems().find(item => item.id === editingItemId);
        if (existingItem) {
            imageDataUrl = existingItem.image || '';
        }
    }

    const newItem = {
        id: editingItemId || Date.now().toString(36) + Math.random().toString(36).substr(2, 9), // Gera ID único
        name: itemNameInput.value.trim(),
        description: itemDescriptionInput.value.trim(),
        quantity: parseInt(itemQuantityInput.value),
        purchasePrice: parseFloat(itemPurchasePriceInput.value),
        salePrice: parseFloat(itemSalePriceInput.value),
        supplier: itemSupplierInput.value.trim(),
        image: imageDataUrl,
        registeredAt: editingItemId ? loadItems().find(item => item.id === editingItemId).registeredAt : new Date().toISOString() // Mantém data original se estiver editando
    };

    let items = loadItems();

    if (editingItemId) {
        // Modo de edição: encontra e atualiza o item
        items = items.map(item => item.id === editingItemId ? { ...item, ...newItem } : item);
        showNotification('Item atualizado com sucesso!', 'success');
    } else {
        // Modo de adição: adiciona novo item
        items.push(newItem);
        showNotification('Item cadastrado com sucesso!', 'success');
    }

    saveItems(items);
    clearForm();
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

        saveItemBtn.textContent = 'Atualizar Item';
        saveItemBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar Item'; // Ícone de atualização
        cancelEditBtn.style.display = 'inline-flex'; // Mostra o botão de cancelar
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo para facilitar a edição
    } else {
        showNotification("Item não encontrado para edição.", "error");
    }
}

/**
 * Exclui um item.
 * @param {string} id - O ID do item a ser excluído.
 */
function deleteItem(id) {
    if (confirm('Tem certeza que deseja excluir este item?')) {
        let items = loadItems();
        const initialLength = items.length;
        items = items.filter(item => item.id !== id);

        if (items.length < initialLength) { // Verifica se algum item foi realmente removido
            saveItems(items);
            showNotification('Item excluído com sucesso!', 'success');
            // Se estiver editando o item que foi excluído, limpa o formulário
            if (editingItemId === id) {
                clearForm();
            }
        } else {
            showNotification("Erro ao excluir item: Item não encontrado.", "error");
        }
    }
}

// --- Funções de Imagem ---

/**
 * Lida com a pré-visualização da imagem selecionada.
 */
function handleImagePreview() {
    const file = itemImageInput.files[0];
    if (file) {
        // Limite de tamanho da imagem (ex: 1MB) para pré-visualização
        const MAX_IMAGE_SIZE_MB = 1;
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            showNotification(`A imagem selecionada é muito grande para pré-visualização imediata. Tamanho máximo: ${MAX_IMAGE_SIZE_MB}MB.`, "warning", 5000);
            previewImage.src = '';
            previewImage.classList.add('hidden');
            noImageText.classList.remove('hidden');
            // Não limpa o input, permite que o usuário tente salvar se desejar, mas ele será validado em addItem
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
        // Se nenhum arquivo selecionado, e não está editando ou o item em edição não tem imagem
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
    if (items.length === 0) {
        showNotification("Não há dados para exportar.", "info");
        return;
    }

    try {
        const dataStr = JSON.stringify(items, null, 2); // Formata com indentação
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estoque_backup_${new Date().toISOString().split('T')[0]}.json`; // Nome do arquivo com data
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Libera o URL do objeto
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
            const importedItems = JSON.parse(e.target.result);
            if (!Array.isArray(importedItems)) {
                throw new Error('O arquivo JSON não contém um array de itens válido (esperado um array principal).');
            }

            // Opcional: validar estrutura básica dos itens importados
            const isValidImport = importedItems.every(item =>
                typeof item.id === 'string' &&
                typeof item.name === 'string' &&
                typeof item.quantity === 'number' &&
                typeof item.purchasePrice === 'number' &&
                typeof item.salePrice === 'number'
                // Pode adicionar mais validações aqui
            );

            if (!isValidImport && importedItems.length > 0) {
                 showNotification('O arquivo JSON contém itens com formato inválido. A importação pode não ser completa.', 'warning', 7000);
            }


            if (confirm('Deseja sobrescrever o estoque atual com os dados importados? Clique em OK para sobrescrever, ou Cancelar para mesclar (adicionar novos itens e atualizar existentes).')) {
                saveItems(importedItems); // Sobrescreve
                showNotification('Dados importados e estoque sobrescrito com sucesso!', 'success');
            } else {
                // Mesclar: adicionar novos itens e atualizar existentes
                let currentItems = loadItems();
                importedItems.forEach(importedItem => {
                    const existingIndex = currentItems.findIndex(item => item.id === importedItem.id);
                    if (existingIndex > -1) {
                        // Atualiza item existente
                        currentItems[existingIndex] = { ...currentItems[existingIndex], ...importedItem };
                    } else {
                        // Adiciona novo item
                        currentItems.push(importedItem);
                    }
                });
                saveItems(currentItems);
                showNotification('Dados importados e mesclados com sucesso!', 'success');
            }

        } catch (error) {
            console.error("Erro ao importar dados:", error);
            showNotification('Erro ao importar o arquivo JSON. Certifique-se de que o arquivo está no formato correto. Detalhes: ' + error.message, 'error');
        } finally {
            importFileInput.value = ''; // Limpa o input file para permitir nova importação do mesmo arquivo
        }
    };
    reader.readAsText(file);
}


// --- Event Listeners ---

// Adiciona ou atualiza item ao submeter o formulário
itemForm.addEventListener('submit', addItem);

// Pré-visualização da imagem ao selecionar um arquivo
itemImageInput.addEventListener('change', handleImagePreview);

// Botão de cancelar edição
cancelEditBtn.addEventListener('click', clearForm);

// Busca em tempo real
searchTermInput.addEventListener('input', () => renderItems());

// Exportar dados
exportDataBtn.addEventListener('click', exportData);

// Importar dados
importFileInput.addEventListener('change', importData);

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    renderItems(); // Renderiza os itens existentes ao carregar a página
    // Garante que os inputs file limpem seus valores ao carregar, evitando problemas de cache do navegador
    itemImageInput.value = '';
    importFileInput.value = '';
});