// Dependências: main.js (para acesso a elementos DOM como historyListBody, noHistoryMessage, currentHistoryItemId, updateStockSummary, renderItems)
//               utils.js (para loadMovementHistory, saveMovementHistory, loadItems, saveItems, showNotification)

/**
 * Renderiza o histórico de movimentação para um item específico.
 * @param {string} itemId - O ID do item cujo histórico será renderizado.
 */
function renderMovementHistory(itemId) {
    const history = loadMovementHistory(); // Função em utils.js
    const itemHistory = history[itemId] || []; // Obtém o histórico do item ou um array vazio
    
    // Inverte o array para mostrar os movimentos mais recentes primeiro
    const sortedHistory = [...itemHistory].reverse();

    if (sortedHistory.length === 0) {
        historyListBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Nenhum histórico de movimentação para este item.</td></tr>`;
        noHistoryMessage.classList.remove('hidden');
    } else {
        noHistoryMessage.classList.add('hidden');
        historyListBody.innerHTML = ''; // Limpa o conteúdo existente
        sortedHistory.forEach(movement => {
            const date = new Date(movement.timestamp).toLocaleDateString('pt-BR') + ' ' + new Date(movement.timestamp).toLocaleTimeString('pt-BR');
            const iconClass = movement.type === 'entrada' ? 'fas fa-arrow-alt-circle-up success-icon' : 'fas fa-arrow-alt-circle-down danger-icon';

            const row = `
                <tr>
                    <td><i class="${iconClass}"></i> ${movement.type === 'entrada' ? 'Entrada' : 'Saída'}</td>
                    <td>${movement.quantity}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-danger btn-action-small" onclick="deleteMovement('${itemId}', '${movement.id}')" title="Remover Movimento"><i class="fas fa-times"></i></button>
                    </td>
                </tr>
            `;
            historyListBody.innerHTML += row;
        });
    }
}

/**
 * Adiciona um novo movimento (entrada/saída) para o item atual.
 */
function addMovement() {
    const itemId = currentHistoryItemId; // Pega o ID do item que está sendo visualizado
    if (!itemId) {
        showNotification('Erro: Nenhum item selecionado para adicionar movimento.', 'error');
        return;
    }

    const type = movementTypeSelect.value;
    const quantity = parseInt(movementQuantityInput.value);

    if (isNaN(quantity) || quantity <= 0) {
        showNotification('Por favor, insira uma quantidade válida maior que zero.', 'error');
        return;
    }

    let items = loadItems(); // Função em utils.js
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
        showNotification('Erro: Item não encontrado.', 'error');
        return;
    }

    let item = items[itemIndex];
    let newQuantity = item.quantity;
    let notificationMessage = '';
    let notificationType = 'success';

    if (type === 'entrada') {
        newQuantity += quantity;
        notificationMessage = `Entrada de ${quantity} unidades registrada para ${item.name}.`;
    } else if (type === 'saida') {
        if (newQuantity < quantity) {
            showNotification(`Não há ${quantity} unidades em estoque para ${item.name}. Quantidade atual: ${newQuantity}.`, 'error');
            return;
        }
        newQuantity -= quantity;
        notificationMessage = `Saída de ${quantity} unidades registrada para ${item.name}.`;
    }

    // Atualiza a quantidade do item
    item.quantity = newQuantity;
    item.updatedAt = new Date().toISOString();
    items[itemIndex] = item;
    saveItems(items); // Salva os itens atualizados

    // Adiciona o movimento ao histórico
    let history = loadMovementHistory(); // Função em utils.js
    if (!history[itemId]) {
        history[itemId] = [];
    }
    history[itemId].push({
        id: generateId(), // Função em utils.js
        type,
        quantity,
        timestamp: new Date().toISOString()
    });
    saveMovementHistory(history); // Salva o histórico atualizado

    showNotification(notificationMessage, notificationType); // Função em utils.js
    renderMovementHistory(itemId); // Re-renderiza o histórico dentro do modal
    updateStockSummary(); // Atualiza o resumo do estoque
    // Não renderiza a tabela principal aqui, pois o modal de histórico deve permanecer aberto.
    // A tabela principal será renderizada ao fechar o modal.
}

/**
 * Exclui um movimento específico do histórico de um item.
 * Esta função é chamada por um botão na tabela de histórico.
 * @param {string} itemId - O ID do item.
 * @param {string} movementId - O ID do movimento a ser excluído.
 */
function deleteMovement(itemId, movementId) {
    showConfirmationModal('Tem certeza que deseja remover este movimento do histórico? Isso irá ajustar a quantidade do item.', () => {
        let history = loadMovementHistory(); // Função em utils.js
        let items = loadItems(); // Função em utils.js

        const itemIndex = items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            showNotification('Erro: Item não encontrado para ajustar a quantidade.', 'error');
            return;
        }
        let item = items[itemIndex];

        const movementIndex = history[itemId] ? history[itemId].findIndex(m => m.id === movementId) : -1;

        if (movementIndex > -1) {
            const movementToRemove = history[itemId][movementIndex];

            // Reverte a quantidade do item com base no movimento excluído
            if (movementToRemove.type === 'entrada') {
                item.quantity -= movementToRemove.quantity;
            } else if (movementToRemove.type === 'saida') {
                item.quantity += movementToRemove.quantity;
            }

            // Garante que a quantidade não seja negativa
            if (item.quantity < 0) {
                item.quantity = 0;
            }

            item.updatedAt = new Date().toISOString();
            items[itemIndex] = item; // Atualiza o item na lista de itens
            saveItems(items); // Salva os itens atualizados

            // Remove o movimento do histórico
            history[itemId].splice(movementIndex, 1);
            if (history[itemId].length === 0) {
                delete history[itemId]; // Remove a entrada do item se não houver mais movimentos
            }
            saveMovementHistory(history); // Salva o histórico atualizado

            showNotification('Movimento removido e estoque ajustado!', 'success'); // Função em utils.js
            renderMovementHistory(itemId); // Re-renderiza o histórico no modal
            updateStockSummary(); // Atualiza o resumo do estoque
            // Não renderiza a tabela principal aqui, ela será renderizada ao fechar o modal.
        } else {
            showNotification('Movimento não encontrado no histórico.', 'error');
        }
    }, 'Confirmar Exclusão de Movimento', 'Remover');
}