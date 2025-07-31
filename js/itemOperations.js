// Dependências: main.js (para acesso a elementos DOM e renderItems, updateStockSummary, etc.)
//               utils.js (para showNotification, loadItems, saveItems, clearForm, generateId, etc.)

/**
 * Limpa o formulário de adição/edição de item.
 */
function clearForm() {
    itemForm.reset();
    editingItemId = null;
    saveItemBtn.textContent = 'Adicionar Item';
    saveItemBtn.classList.remove('btn-success');
    saveItemBtn.classList.add('btn-primary');
    cancelEditBtn.classList.add('hidden'); // Esconde o botão Cancelar
    previewImage.src = ''; // Limpa a prévia da imagem
    previewImage.classList.add('hidden');
    noImageText.classList.remove('hidden'); // Mostra o texto "Sem Imagem"
    itemImageInput.value = ''; // Limpa o input de arquivo
}

/**
 * Adiciona ou edita um item no estoque.
 * @param {Event} event - O evento de submissão do formulário.
 */
itemForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = itemNameInput.value.trim();
    const description = itemDescriptionInput.value.trim();
    const quantity = parseInt(itemQuantityInput.value);
    const purchasePrice = parseFloat(itemPurchasePriceInput.value);
    const salePrice = parseFloat(itemSalePriceInput.value);
    const supplier = itemSupplierInput.value.trim();
    let image = previewImage.src; // Pega a imagem da prévia

    // Validação básica
    if (!name || isNaN(quantity) || quantity < 0 || isNaN(purchasePrice) || purchasePrice < 0 || isNaN(salePrice) || salePrice < 0) {
        showNotification('Por favor, preencha todos os campos obrigatórios com valores válidos (Nome, Quantidade, Preço de Compra, Preço de Venda).', 'error');
        return;
    }

    let items = loadItems(); // Função em utils.js
    let notificationMessage = '';
    let notificationType = '';

    if (editingItemId) {
        // Modo de edição
        const itemIndex = items.findIndex(item => item.id === editingItemId);
        if (itemIndex > -1) {
            items[itemIndex] = {
                ...items[itemIndex], // Mantém dados existentes (como histórico, se houver)
                name,
                description,
                quantity,
                purchasePrice,
                salePrice,
                supplier,
                image: image || 'assets/images/placeholder.png', // Garante uma imagem padrão se removida
                updatedAt: new Date().toISOString()
            };
            notificationMessage = 'Item atualizado com sucesso!';
            notificationType = 'success';
        }
    } else {
        // Modo de adição
        const newItem = {
            id: generateId(), // Função em utils.js
            name,
            description,
            quantity,
            purchasePrice,
            salePrice,
            supplier,
            image: image || 'assets/images/placeholder.png',
            registeredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        items.push(newItem);
        notificationMessage = 'Item adicionado com sucesso!';
        notificationType = 'success';
    }

    saveItems(items); // Função em utils.js
    renderItems(); // Função em main.js
    updateStockSummary(); // Função em main.js
    showNotification(notificationMessage, notificationType); // Função em utils.js
    clearForm();
});

/**
 * Preenche o formulário para edição de um item existente.
 * @param {string} id - O ID do item a ser editado.
 */
function editItem(id) {
    const items = loadItems(); // Função em utils.js
    const itemToEdit = items.find(item => item.id === id);

    if (itemToEdit) {
        editingItemId = id;
        itemNameInput.value = itemToEdit.name;
        itemDescriptionInput.value = itemToEdit.description;
        itemQuantityInput.value = itemToEdit.quantity;
        itemPurchasePriceInput.value = itemToEdit.purchasePrice;
        itemSalePriceInput.value = itemToEdit.salePrice;
        itemSupplierInput.value = itemToEdit.supplier;

        if (itemToEdit.image && itemToEdit.image !== 'assets/images/placeholder.png') {
            previewImage.src = itemToEdit.image;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
        } else {
            previewImage.src = '';
            previewImage.classList.add('hidden');
            noImageText.classList.remove('hidden');
        }

        saveItemBtn.textContent = 'Salvar Edição';
        saveItemBtn.classList.remove('btn-primary');
        saveItemBtn.classList.add('btn-success');
        cancelEditBtn.classList.remove('hidden'); // Mostra o botão Cancelar
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Volta para o topo da página
    }
}

/**
 * Cancela a edição e limpa o formulário.
 */
cancelEditBtn.addEventListener('click', clearForm);

/**
 * Exclui um item do estoque.
 * @param {string} id - O ID do item a ser excluído.
 */
function deleteItem(id) {
    showConfirmationModal('Tem certeza que deseja excluir este item? Esta ação é irreversível e também removerá o histórico de movimentação associado!', () => {
        let items = loadItems(); // Função em utils.js
        items = items.filter(item => item.id !== id);
        saveItems(items); // Função em utils.js

        let history = loadMovementHistory(); // Função em utils.js
        delete history[id]; // Remove todo o histórico do item
        saveMovementHistory(history); // Função em utils.js

        renderItems(); // Função em main.js
        updateStockSummary(); // Função em main.js
        showNotification('Item e histórico de movimentação excluídos com sucesso!', 'success'); // Função em utils.js
    }, 'Confirmar Exclusão', 'Excluir');
}

// Lidar com upload de imagem
itemImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
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