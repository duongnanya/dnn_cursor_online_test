// Todo List Application
class TodoApp {
    constructor() {
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        this.updateStats();
    }

    bindEvents() {
        // Add todo
        const addBtn = document.getElementById('addBtn');
        const todoInput = document.getElementById('todoInput');
        
        addBtn.addEventListener('click', () => this.addTodo());
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo();
            }
        });

        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Clear completed
        const clearBtn = document.getElementById('clearCompleted');
        clearBtn.addEventListener('click', () => this.clearCompleted());
    }

    addTodo(parentId = null) {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();
        
        if (text === '') {
            this.showMessage('Vui lòng nhập nội dung công việc!', 'warning');
            return;
        }

        if (text.length > 100) {
            this.showMessage('Nội dung công việc quá dài (tối đa 100 ký tự)!', 'warning');
            return;
        }

        const parentLevel = parentId ? this.todos.find(t => t.id === parentId)?.level || 0 : -1;
        // Calculate correct order based on siblings
        const siblings = this.todos.filter(t => t.parentId === parentId);
        const order = siblings.length;
        
        const todo = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            parentId: parentId,
            level: parentLevel + 1,
            order: order
        };

        this.todos.unshift(todo);
        input.value = '';
        this.saveTodos();
        this.render();
        this.updateStats();
        this.showMessage('Đã thêm công việc mới!', 'success');
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.render();
            this.updateStats();
            
            const message = todo.completed ? 'Đã hoàn thành!' : 'Đã bỏ đánh dấu hoàn thành!';
            this.showMessage(message, 'success');
        }
    }

    deleteTodo(id) {
        if (confirm('Bạn có chắc muốn xóa công việc này và tất cả công việc con?')) {
            // Xóa todo và tất cả todo con
            const todosToDelete = this.getAllChildren(id);
            todosToDelete.push(id);
            this.todos = this.todos.filter(t => !todosToDelete.includes(t.id));
            this.saveTodos();
            this.render();
            this.updateStats();
            this.showMessage('Đã xóa công việc!', 'success');
        }
    }

    getAllChildren(parentId) {
        const children = [];
        const findChildren = (id) => {
            this.todos.forEach(todo => {
                if (todo.parentId === id) {
                    children.push(todo.id);
                    findChildren(todo.id);
                }
            });
        };
        findChildren(parentId);
        return children;
    }

    addSubTodo(parentId) {
        const parentTodo = this.todos.find(t => t.id === parentId);
        if (!parentTodo) return;

        const text = prompt(`Thêm công việc con cho "${parentTodo.text}":`);
        if (text && text.trim()) {
            if (text.trim().length > 100) {
                this.showMessage('Nội dung công việc quá dài (tối đa 100 ký tự)!', 'warning');
                return;
            }

            const parentLevel = parentTodo.level;
            // Calculate correct order based on siblings
            const siblings = this.todos.filter(t => t.parentId === parentId);
            const order = siblings.length;
            
            const todo = {
                id: Date.now().toString(),
                text: text.trim(),
                completed: false,
                createdAt: new Date().toISOString(),
                parentId: parentId,
                level: parentLevel + 1,
                order: order
            };

            this.todos.unshift(todo);
            this.saveTodos();
            this.render();
            this.updateStats();
            this.showMessage('Đã thêm công việc con!', 'success');
        }
    }

    editTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const newText = prompt('Chỉnh sửa công việc:', todo.text);
        if (newText !== null && newText.trim() !== '') {
            if (newText.trim().length > 100) {
                this.showMessage('Nội dung công việc quá dài (tối đa 100 ký tự)!', 'warning');
                return;
            }
            todo.text = newText.trim();
            this.saveTodos();
            this.render();
            this.showMessage('Đã cập nhật công việc!', 'success');
        }
    }

    moveTodo(id, direction) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const siblings = this.todos.filter(t => t.parentId === todo.parentId);
        const currentIndex = siblings.findIndex(t => t.id === id);
        
        if (direction === 'up' && currentIndex > 0) {
            // Hoán đổi vị trí trong mảng gốc
            const currentTodo = siblings[currentIndex];
            const previousTodo = siblings[currentIndex - 1];
            
            // Tìm index trong mảng gốc
            const currentIndexInMain = this.todos.findIndex(t => t.id === currentTodo.id);
            const previousIndexInMain = this.todos.findIndex(t => t.id === previousTodo.id);
            
            // Hoán đổi trong mảng gốc
            [this.todos[currentIndexInMain], this.todos[previousIndexInMain]] = 
            [this.todos[previousIndexInMain], this.todos[currentIndexInMain]];
            
        } else if (direction === 'down' && currentIndex < siblings.length - 1) {
            // Hoán đổi vị trí trong mảng gốc
            const currentTodo = siblings[currentIndex];
            const nextTodo = siblings[currentIndex + 1];
            
            // Tìm index trong mảng gốc
            const currentIndexInMain = this.todos.findIndex(t => t.id === currentTodo.id);
            const nextIndexInMain = this.todos.findIndex(t => t.id === nextTodo.id);
            
            // Hoán đổi trong mảng gốc
            [this.todos[currentIndexInMain], this.todos[nextIndexInMain]] = 
            [this.todos[nextIndexInMain], this.todos[currentIndexInMain]];
        }

        // Cập nhật lại order cho tất cả siblings
        const updatedSiblings = this.todos.filter(t => t.parentId === todo.parentId);
        updatedSiblings.forEach((sibling, index) => {
            sibling.order = index;
        });

        this.saveTodos();
        this.render();
        this.showMessage('Đã thay đổi thứ tự!', 'success');
    }

    changeLevel(id, direction) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const oldParentId = todo.parentId;
        const oldLevel = todo.level;

        if (direction === 'promote' && todo.level > 0) {
            // Tìm parent của parent
            const grandParent = this.todos.find(t => t.id === todo.parentId);
            if (grandParent) {
                todo.parentId = grandParent.parentId;
                todo.level = grandParent.level;
            } else {
                todo.parentId = null;
                todo.level = 0;
            }
        } else if (direction === 'demote') {
            // Tìm sibling trước đó để làm parent
            const siblings = this.todos.filter(t => t.parentId === todo.parentId);
            const currentIndex = siblings.findIndex(t => t.id === id);
            
            if (currentIndex > 0) {
                const newParent = siblings[currentIndex - 1];
                todo.parentId = newParent.id;
                todo.level = newParent.level + 1;
            }
        }

        // Nếu có thay đổi level, di chuyển todo xuống cuối danh sách siblings mới (indent effect)
        if (oldParentId !== todo.parentId || oldLevel !== todo.level) {
            // Tìm tất cả siblings mới
            const newSiblings = this.todos.filter(t => t.parentId === todo.parentId && t.id !== todo.id);
            
            // Cập nhật order cho siblings cũ (loại bỏ todo hiện tại)
            const oldSiblings = this.todos.filter(t => t.parentId === oldParentId && t.id !== todo.id);
            oldSiblings.forEach((sibling, index) => {
                sibling.order = index;
            });
            
            // Đặt todo mới ở cuối danh sách siblings mới
            todo.order = newSiblings.length;
            
            // Cập nhật order cho tất cả siblings mới
            newSiblings.forEach((sibling, index) => {
                sibling.order = index;
            });
        }

        this.saveTodos();
        this.render();
        this.showMessage('Đã thay đổi cấp độ!', 'success');
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.render();
    }

    clearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        
        if (completedCount === 0) {
            this.showMessage('Không có công việc đã hoàn thành nào để xóa!', 'warning');
            return;
        }

        if (confirm(`Bạn có chắc muốn xóa ${completedCount} công việc đã hoàn thành?`)) {
            this.todos = this.todos.filter(t => !t.completed);
            this.saveTodos();
            this.render();
            this.updateStats();
            this.showMessage(`Đã xóa ${completedCount} công việc đã hoàn thành!`, 'success');
        }
    }

    getFilteredTodos() {
        let filtered = [];
        switch (this.currentFilter) {
            case 'pending':
                filtered = this.todos.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = this.todos.filter(t => t.completed);
                break;
            default:
                filtered = this.todos;
        }
        
        // Sắp xếp theo cấu trúc phân cấp
        return this.sortTodosHierarchically(filtered);
    }

    sortTodosHierarchically(todos) {
        const result = [];
        const todoMap = new Map();
        
        // Tạo map để dễ tìm kiếm
        todos.forEach(todo => {
            todoMap.set(todo.id, { ...todo, children: [] });
        });
        
        // Xây dựng cây
        const roots = [];
        todos.forEach(todo => {
            if (todo.parentId && todoMap.has(todo.parentId)) {
                todoMap.get(todo.parentId).children.push(todoMap.get(todo.id));
            } else {
                roots.push(todoMap.get(todo.id));
            }
        });
        
        // Sắp xếp roots theo order
        roots.sort((a, b) => a.order - b.order);
        
        // Duyệt cây theo thứ tự
        const traverse = (nodes) => {
            nodes.forEach(node => {
                result.push(node);
                if (node.children.length > 0) {
                    node.children.sort((a, b) => a.order - b.order);
                    traverse(node.children);
                }
            });
        };
        
        traverse(roots);
        return result;
    }

    render() {
        const todoList = document.getElementById('todoList');
        const emptyState = document.getElementById('emptyState');
        const filteredTodos = this.getFilteredTodos();

        if (filteredTodos.length === 0) {
            todoList.innerHTML = '';
            emptyState.classList.add('show');
            return;
        }

        emptyState.classList.remove('show');
        
        todoList.innerHTML = filteredTodos.map(todo => `
            <div class="todo-item" data-id="${todo.id}" style="margin-left: ${todo.level * 30}px;">
                <div class="todo-content">
                    <div class="todo-checkbox ${todo.completed ? 'completed' : ''}" 
                         onclick="todoApp.toggleTodo('${todo.id}')">
                        ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                    <div class="todo-text ${todo.completed ? 'completed' : ''}" 
                         ondblclick="todoApp.editTodo('${todo.id}')">${this.escapeHtml(todo.text)}</div>
                </div>
                <div class="todo-actions">
                    <button class="action-btn add-sub-btn" onclick="todoApp.addSubTodo('${todo.id}')" 
                            title="Thêm công việc con">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="todoApp.editTodo('${todo.id}')" 
                            title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <div class="move-controls">
                        <button class="action-btn move-btn" onclick="todoApp.moveTodo('${todo.id}', 'up')" 
                                title="Di chuyển lên">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="action-btn move-btn" onclick="todoApp.moveTodo('${todo.id}', 'down')" 
                                title="Di chuyển xuống">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    </div>
                    <div class="level-controls">
                        <button class="action-btn level-btn" onclick="todoApp.changeLevel('${todo.id}', 'promote')" 
                                title="Nâng cấp" ${todo.level === 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <button class="action-btn level-btn" onclick="todoApp.changeLevel('${todo.id}', 'demote')" 
                                title="Hạ cấp">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <button class="action-btn delete-btn" onclick="todoApp.deleteTodo('${todo.id}')" 
                            title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const totalTasks = document.getElementById('totalTasks');
        const clearBtn = document.getElementById('clearCompleted');
        
        totalTasks.textContent = this.todos.length;
        
        const completedCount = this.todos.filter(t => t.completed).length;
        clearBtn.disabled = completedCount === 0;
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;

        // Add styles for message
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 300px;
        `;

        // Add animation keyframes
        if (!document.querySelector('#messageStyles')) {
            const style = document.createElement('style');
            style.id = 'messageStyles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(messageEl);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveTodos() {
        try {
            localStorage.setItem('todos', JSON.stringify(this.todos));
        } catch (error) {
            console.error('Error saving todos:', error);
            this.showMessage('Lỗi khi lưu dữ liệu!', 'warning');
        }
    }

    loadTodos() {
        try {
            const saved = localStorage.getItem('todos');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading todos:', error);
            this.showMessage('Lỗi khi tải dữ liệu!', 'warning');
            return [];
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.todoApp = new TodoApp();
});

// Add some sample todos for demo (only if no existing todos)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.todoApp && window.todoApp.todos.length === 0) {
            const sampleTodos = [
                { id: '1', text: 'Học JavaScript', completed: false, createdAt: new Date().toISOString(), parentId: null, level: 0, order: 0 },
                { id: '2', text: 'Tập thể dục', completed: true, createdAt: new Date().toISOString(), parentId: null, level: 0, order: 1 },
                { id: '3', text: 'Đọc sách', completed: false, createdAt: new Date().toISOString(), parentId: null, level: 0, order: 2 },
                { id: '4', text: 'Học React', completed: false, createdAt: new Date().toISOString(), parentId: '1', level: 1, order: 0 },
                { id: '5', text: 'Học Node.js', completed: false, createdAt: new Date().toISOString(), parentId: '1', level: 1, order: 1 },
                { id: '6', text: 'Chạy bộ', completed: false, createdAt: new Date().toISOString(), parentId: '2', level: 1, order: 0 },
                { id: '7', text: 'Học Hooks', completed: false, createdAt: new Date().toISOString(), parentId: '4', level: 2, order: 0 }
            ];
            
            window.todoApp.todos = sampleTodos;
            window.todoApp.saveTodos();
            window.todoApp.render();
            window.todoApp.updateStats();
        }
    }, 100);
});