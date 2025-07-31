// Dependências: main.js (para acesso a elementos DOM como notificationContainer, itemForm, searchTermInput, etc.)
//               itemOperations.js (para clearForm)
//               historyManagement.js (para renderMovementHistory)

/**
 * Exibe uma notificação (toast message) na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação (success, error, info, warning).
 * @param {number} duration - Duração em milissegundos antes da notificação desaparecer.
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.innerHTML = `
        <span class="icon">${getNotificationIcon(type)}</span>
        <span class="message">${message}</span>
    `;
    notificationContainer.appendChild(notification);

    // Animação de entrada
    requestAnimationFrame(() => {
        notification.style.animation = `slideIn 0.5s forwards`;
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });


    // Configura o timeout para remover a notificação
    setTimeout(() => {
        // Animação de saída
        notification.style.animation = `fadeOut 0.5s forwards`;
        notification.addEventListener('animationend', () => {
            notification.remove();
        }, { once: true });
    }, duration);
}

/**
 * Retorna o ícone Font Awesome com base no tipo de notificação.
 * @param {string} type - O tipo de notificação.
 * @returns {string} - O HTML do ícone.
 */
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return '<i class="fas fa-check-circle"></i>';
        case 'error': return '<i class="fas fa-times-circle"></i>';
        case 'info': return '<i class="fas fa-info-circle"></i>';
        case 'warning': return '<i class="fas fa-exclamation-triangle"></i>';
        default: return '<i class="fas fa-info-circle"></i>';
    }
}

/**
 * Carrega os itens do estoque do LocalStorage.
 * @returns {Array} - Um array de itens.
 */
function loadItems() {
    const itemsJson = localStorage.getItem('stockItems');
    return itemsJson ? JSON.parse(itemsJson) : [];
}

/**
 * Salva os itens do estoque no LocalStorage.
 * @param {Array} items - O array de itens a ser salvo.
 */
function saveItems(items) {
    localStorage.setItem('stockItems', JSON.stringify(items));
}

/**
 * Carrega o histórico de movimentação do LocalStorage.
 * @returns {Object} - Um objeto onde as chaves são os IDs dos itens e os valores são arrays de movimentos.
 */
function loadMovementHistory() {
    const historyJson = localStorage.getItem('movementHistory');
    return historyJson ? JSON.parse(historyJson) : {};
}

/**
 * Salva o histórico de movimentação no LocalStorage.
 * @param {Object} history - O objeto de histórico a ser salvo.
 */
function saveMovementHistory(history) {
    localStorage.setItem('movementHistory', JSON.stringify(history));
}

/**
 * Gera um ID único simples.
 * @returns {string} - Um ID único.
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Alterna entre o modo claro e escuro.
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    updateDarkModeToggleIcon(isDarkMode);
}

/**
 * Carrega a preferência de modo escuro do LocalStorage.
 */
function loadDarkModePreference() {
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    updateDarkModeToggleIcon(darkModePreference === 'enabled');
}

/**
 * Atualiza o ícone do botão de toggle do modo escuro.
 * @param {boolean} isDarkMode - Se o modo escuro está ativo.
 */
function updateDarkModeToggleIcon(isDarkMode) {
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
 * Exporta os dados do estoque e histórico para um arquivo JSON.
 */
exportDataBtn.addEventListener('click', () => {
    const items = loadItems();
    const history = loadMovementHistory();
    const data = { items, history };
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
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.items && Array.isArray(importedData.items)) {
                    showConfirmationModal('Ao importar, os dados atuais do estoque e histórico serão substituídos. Deseja continuar?', () => {
                        saveItems(importedData.items);
                        if (importedData.history) {
                            saveMovementHistory(importedData.history);
                        } else {
                            localStorage.removeItem('movementHistory'); // Limpa histórico se não houver no importado
                        }
                        showNotification('Dados importados com sucesso!', 'success');
                        clearForm(); // Função em itemOperations.js
                        searchTermInput.value = '';
                        currentPage = 1;
                        renderItems(); // Função em main.js
                        updateStockSummary(); // Função em main.js
                        importFileInput.value = ''; // Limpa o input de arquivo
                    }, 'Confirmar Importação', 'Importar');

                } else {
                    showNotification('O arquivo JSON importado não contém o formato esperado de dados de estoque.', 'error');
                }
            } catch (error) {
                showNotification('Erro ao ler o arquivo JSON. Certifique-se de que é um JSON válido.', 'error');
                console.error('Erro de importação:', error);
            }
        };
        reader.readAsText(file);
    }
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
        clearForm(); // Função em itemOperations.js
        searchTermInput.value = ''; // Limpa o campo de busca
        currentPage = 1; // Volta para a primeira página
        itemsPerPageSelect.value = '10'; // Reseta para 10 itens por página
        itemsPerPage = 10;
        showLowStockItemsBtn.classList.remove('active'); // Desativa o filtro de baixo estoque
        showLowStockItemsBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ver Baixo Estoque';
        renderItems(); // Função em main.js
        updateStockSummary(); // Função em main.js
        clearSearchBtn.style.display = 'none'; // Esconde o botão de limpar busca
    }, 'Confirmar Limpeza Total', 'Limpar Tudo'); // Adiciona título e texto do botão de confirmação
}