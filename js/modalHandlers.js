// Dependências: main.js (para acesso a elementos DOM e variáveis de estado como confirmationCallback, editingItemId)
//               utils.js (para loadItems, saveItems, showNotification)
//               historyManagement.js (para renderMovementHistory)

/**
 * Exibe o modal de confirmação com a mensagem e callbacks especificados.
 * @param {string} message - A mensagem a ser exibida no modal.
 * @param {Function} onConfirm - A função a ser executada se o usuário confirmar.
 * @param {string} [title='Confirmação'] - Título do modal.
 * @param {string} [confirmText='Confirmar'] - Texto do botão de confirmação.
 */
function showConfirmationModal(message, onConfirm, title = 'Confirmação', confirmText = 'Confirmar') {
    confirmationModalTitle.textContent = title;
    confirmationModalText.textContent = message;
    confirmActionButton.textContent = confirmText;
    confirmationCallback = onConfirm; // Armazena o callback para execução posterior
    confirmationModal.style.display = 'flex'; // Exibe o modal
    // Adiciona classe para animação
    confirmationModal.querySelector('.modal-content').classList.remove('hidden'); // Ensure content is visible
}

/**
 * Esconde o modal de confirmação e limpa o callback.
 */
function closeConfirmationModal() {
    confirmationModal.style.display = 'none';
    confirmationCallback = null;
    confirmationModal.querySelector('.modal-content').classList.add('hidden'); // Hide content
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
    showNotification('Ação cancelada.', 'info');
}

/**
 * Abre o modal de descrição com o texto completo do item.
 * @param {string} itemId - O ID do item cuja descrição será exibida.
 */
function openDescriptionModal(itemId) {
    const items = loadItems(); // Função em utils.js
    const item = items.find(i => i.id === itemId);

    if (item && item.description) {
        descriptionModalTitle.textContent = `Descrição de: ${item.name}`;
        descriptionModalText.textContent = item.description;
        descriptionModal.style.display = 'flex';
        descriptionModal.querySelector('.modal-content').classList.remove('hidden');
    } else {
        showNotification('Descrição não disponível para este item.', 'info');
    }
}

/**
 * Fecha o modal de descrição.
 */
function closeDescriptionModal() {
    descriptionModal.style.display = 'none';
    descriptionModal.querySelector('.modal-content').classList.add('hidden');
}

let currentHistoryItemId = null; // Variável para armazenar o ID do item cujo histórico está sendo visualizado

/**
 * Abre o modal de histórico de movimentação para um item específico.
 * @param {string} itemId - O ID do item para o qual o histórico será exibido.
 */
function showHistoryModal(itemId) {
    currentHistoryItemId = itemId; // Armazena o ID do item atual
    const items = loadItems(); // Função em utils.js
    const item = items.find(i => i.id === itemId);

    if (item) {
        historyModalTitle.textContent = `Histórico de Movimentação`;
        historyItemName.textContent = item.name; // Exibe o nome do item no modal
        renderMovementHistory(itemId); // Função em historyManagement.js
        historyModal.style.display = 'flex';
        historyModal.querySelector('.modal-content').classList.remove('hidden');

        // Reseta o formulário de movimento
        movementTypeSelect.value = 'entrada';
        movementQuantityInput.value = 1;
    } else {
        showNotification('Item não encontrado para visualizar histórico.', 'error');
    }
}

/**
 * Fecha o modal de histórico de movimentação.
 */
function closeHistoryModal() {
    historyModal.style.display = 'none';
    currentHistoryItemId = null; // Limpa o ID do item atual
    historyModal.querySelector('.modal-content').classList.add('hidden');
    renderItems(); // Re-renderiza a tabela principal para refletir possíveis mudanças na quantidade
}