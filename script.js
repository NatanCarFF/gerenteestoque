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

let editingItemId = null; // Variável para controlar se estamos editando um item existente

// --- Funções Auxiliares ---

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
        return [];
    }
}

/**
 * Salva os itens no LocalStorage.
 * @param {Array} items - Array de objetos de itens a serem salvos.
 */
function saveItems(items) {
    localStorage.setItem('stockItems', JSON.stringify(items));
    renderItems(); // Renderiza os itens novamente após salvar
}

/**
 * Exibe ou esconde a tabela e a mensagem "nenhum item".
 */
function toggleTableVisibility() {
    const items = loadItems();
    if (items.length === 0) {
        itemTable.classList.add('hidden');
        noItemsMessage.classList.remove('hidden');
    } else {
        itemTable.classList.remove('hidden');
        noItemsMessage.classList.add('hidden');
    }
}

/**
 * Limpa o formulário após adicionar/editar um item.
 */
function clearForm() {
    itemForm.reset(); // Reseta todos os campos do formulário
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
 * @param {Array} [itemsToRender=loadItems()] - Array de itens para renderizar. Se não for fornecido, carrega todos.
 */
function renderItems(itemsToRender = loadItems()) {
    itemListBody.innerHTML = ''; // Limpa a tabela antes de renderizar
    toggleTableVisibility();

    // Aplica o filtro de busca se houver um termo
    const searchTerm = searchTermInput.value.toLowerCase().trim();
    const filteredItems = itemsToRender.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
               item.description.toLowerCase().includes(searchTerm) ||
               item.supplier.toLowerCase().includes(searchTerm);
    });

    if (filteredItems.length === 0 && searchTerm !== "") {
        itemListBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Nenhum item encontrado para "${searchTerm}".</td></tr>`;
        return;
    } else if (filteredItems.length === 0) {
         // Se não há itens e não há termo de busca, a mensagem de "nenhum item" já estará visível pelo toggleTableVisibility
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
            <td>${item.description}</td>
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

    const imageFile = itemImageInput.files[0];
    let imageDataUrl = '';

    if (imageFile) {
        // Converte a imagem para Base64
        imageDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(imageFile);
        }).catch(error => {
            console.error("Erro ao ler arquivo de imagem:", error);
            alert("Erro ao carregar a imagem. Tente novamente.");
            return '';
        });
    } else if (previewImage.src && !previewImage.classList.contains('hidden')) {
        // Se não selecionou nova imagem mas já existe uma pré-visualização (edicao), usa a existente
        imageDataUrl = previewImage.src;
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
        alert('Item atualizado com sucesso!');
    } else {
        // Modo de adição: adiciona novo item
        items.push(newItem);
        alert('Item cadastrado com sucesso!');
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
    }
}

/**
 * Exclui um item.
 * @param {string} id - O ID do item a ser excluído.
 */
function deleteItem(id) {
    if (confirm('Tem certeza que deseja excluir este item?')) {
        let items = loadItems();
        items = items.filter(item => item.id !== id);
        saveItems(items);
        alert('Item excluído com sucesso!');
        // Se estiver editando o item que foi excluído, limpa o formulário
        if (editingItemId === id) {
            clearForm();
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
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        // Se nenhum arquivo selecionado, verifica se há imagem de item sendo editado
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
    alert('Dados exportados com sucesso!');
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
        alert('Por favor, selecione um arquivo JSON válido.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedItems = JSON.parse(e.target.result);
            if (!Array.isArray(importedItems)) {
                throw new Error('O arquivo JSON não contém um array de itens válido.');
            }

            // Opcional: perguntar ao usuário se deseja sobrescrever ou mesclar
            if (confirm('Deseja sobrescrever o estoque atual com os dados importados? Clique em OK para sobrescrever, ou Cancelar para mesclar (adicionar novos itens e atualizar existentes).')) {
                saveItems(importedItems); // Sobrescreve
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
            }

            alert('Dados importados com sucesso!');
            renderItems();
        } catch (error) {
            console.error("Erro ao importar dados:", error);
            alert('Erro ao importar o arquivo JSON. Certifique-se de que o arquivo está no formato correto. Detalhes: ' + error.message);
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
    // Garante que o input file limpe seu valor ao carregar, evitando problemas de cache do navegador
    itemImageInput.value = '';
    importFileInput.value = '';
});