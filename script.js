// Todo List Application
class TodoApp {
    constructor() {
        this.projects = this.loadProjects();
        this.currentProjectId = this.loadCurrentProject();
        this.todos = this.loadTodos();
        this.currentFilter = 'pending'; // Mặc định hiển thị "Còn"
        this.searchQuery = '';
        this.draggedTodo = null;
        this.dropTarget = null;
        this.selectedTodos = new Set();
        this.parentSelectionMode = false;
        this.selectedChildId = null;
        this.prioritySelectionMode = false;
        this.selectedPriorityTodoId = null;
        this.collapsedTodos = new Set();
        
        // Firebase properties
        this.user = null;
        this.isAuthenticated = false;
        this.firebaseAuth = null;
        this.firebaseDB = null;
        this.googleProvider = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initFirebase();
        // Kiểm tra dữ liệu local trước khi check auth
        if (this.hasLocalData()) {
            this.showMainApp();
            this.loadLocalData();
        }
        this.checkAuthState();
    }

    bindEvents() {
        // Auth buttons
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const syncBtn = document.getElementById('syncBtn');
        const createProjectBtn = document.getElementById('createProjectBtn');
        const userAvatar = document.getElementById('userAvatar');
        const userMenu = document.getElementById('userMenu');
        
        // Context menu event
        document.addEventListener('contextmenu', (e) => {
            this.handleContextMenu(e);
        });
        
        // Click outside to close context menu
        document.addEventListener('click', (e) => {
            // Không đóng context menu nếu click vào chính nó
            if (!e.target.closest('.custom-context-menu')) {
                this.closeContextMenu();
            }
        });

        
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => {
                this.signInWithGoogle();
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.signOut();
            });
        }
        
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncData();
            });
        }
        
        const archivedProjectsBtn = document.getElementById('archivedProjectsBtn');
        if (archivedProjectsBtn) {
            archivedProjectsBtn.addEventListener('click', () => {
                this.showArchivedProjects();
            });
        }
        
        if (createProjectBtn) {
            createProjectBtn.addEventListener('click', () => {
                this.createProject();
            });
        }
        
        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }
        
        // Đóng menu khi click bên ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-avatar-container')) {
                this.closeUserMenu();
            }
            
            // Cancel selection modes when clicking outside
            if (this.parentSelectionMode && !e.target.closest('.todo-item')) {
                this.cancelParentSelection();
            }
            
            if (this.prioritySelectionMode && !e.target.closest('.todo-item')) {
                this.cancelPrioritySelection();
            }
        });

        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
        
        // Collapse All button
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => {
                this.toggleCollapseAll();
            });
        }



        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearch');
        
        searchInput.addEventListener('input', (e) => {
            this.setSearchQuery(e.target.value);
        });
        
        clearSearchBtn.addEventListener('click', () => {
            this.clearSearch();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Close parent selection mode when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.todo-item')) {
                // Cancel parent selection mode
                if (this.parentSelectionMode) {
                    this.cancelParentSelection();
                }
            }
        });

        // Double-click on multi-project-container to toggle planner mode
        const multiProjectContainer = document.getElementById('multiProjectContainer');
    }

    addTodo(parentId = null) {
        // Method này không còn được sử dụng, todos được thêm qua addTodoToProject
    }
    
    addTodoToProject(projectId) {
        const text = prompt('Nhập nội dung công việc mới:');
        
        if (!text || text.trim() === '') {
            return;
        }
        
        const trimmedText = text.trim();
        
        if (trimmedText.length > 100) {
            this.showMessage('Nội dung công việc không được vượt quá 100 ký tự!', 'warning');
            return;
        }
        
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            this.showMessage('Project không tồn tại!', 'warning');
            return;
        }
        
        // Get siblings at the same level (no parent)
        const siblings = this.todos.filter(todo => 
            todo.parentId === null && 
            todo.projectId === projectId
        );
        
        const newTodo = {
            id: this.generateId(),
            text: trimmedText,
            completed: false,
            parentId: null,
            level: 0,
            order: siblings.length,
            projectId: projectId,
            createdAt: new Date().toISOString(),
            timeBlocks: 1, // Default 1 block (5 phút)
            skipped: false // Default not skipped
        };
        
        this.todos.unshift(newTodo);
        this.saveTodos();
        this.render();
        this.updateStats();
        this.showMessage('Đã thêm công việc mới!', 'success');
    }

    toggleTodo(id) {
        console.log('toggleTodo called with id:', id);
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            
            // Lưu thời gian xong khi đánh dấu xong
            if (todo.completed) {
                todo.completedAt = new Date().toISOString();
                // Khi click trực tiếp checkbox, luôn reset về 1 phút
                todo.timeBlocks = 1;
            } else {
                // Xóa thời gian xong khi bỏ đánh dấu
                delete todo.completedAt;
            }
            
            this.saveTodos();
            this.updateTodoItem(id); // Chỉ update todo item cụ thể
            this.updateStats();
            
            const message = todo.completed ? 'Đã xong!' : 'Đã bỏ đánh dấu xong!';
            this.showMessage(message, 'success');
        } else {
            console.error('Todo not found with id:', id);
        }
    }

    setTimeBlocks(id, blocks) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            // Convert blocks to minutes/hours for storage
            let timeValue;
            if (blocks === 2) timeValue = 10;      // 2 blocks -> 10 phút
            else if (blocks === 4) timeValue = 20; // 4 blocks -> 20 phút
            else if (blocks === 6) timeValue = 30; // 6 blocks -> 30 phút
            else if (blocks === 12) timeValue = 60; // 12 blocks -> 1 giờ (60 phút)
            else if (blocks === 24) timeValue = 120; // 24 blocks -> 2 giờ (120 phút)
            else timeValue = blocks; // Fallback
            
            todo.timeBlocks = timeValue;
            todo.completed = true; // Tự động đánh dấu hoàn thành khi set time blocks
            todo.completedAt = new Date().toISOString();
            this.saveTodos();
            this.updateTodoItem(id);
            this.updateStats();
            
            const displayText = timeValue === 60 ? '1h' : timeValue === 120 ? '2h' : `${timeValue} phút`;
            this.showMessage(`Đã set ${displayText}!`, 'success');
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

    skipTodo(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;

        // Skip todo ngay lập tức
        const childrenIds = this.getAllChildren(todoId);
        const childrenCount = childrenIds.length;
        this.performSkip(todoId, childrenIds, childrenCount);
    }


    performSkip(todoId, childrenIds, childrenCount) {
        // Skip todo và tất cả children
        const allIds = [todoId, ...childrenIds];
        
        allIds.forEach(id => {
            const todo = this.todos.find(t => t.id === id);
            if (todo) {
                todo.skipped = true;
                todo.skippedAt = new Date().toISOString();
            }
        });

        this.saveTodos();
        this.render();
        
        const message = childrenCount > 0 
            ? `Đã skip todo và ${childrenCount} công việc con!`
            : 'Đã skip todo!';
        this.showMessage(message, 'success');
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

    getChildrenCount(parentId) {
        // Đếm tất cả children để giữ nguyên thống kê bất kể filter
        return this.getAllChildren(parentId).length;
    }

    hasChildren(parentId) {
        // Kiểm tra xem todo có children trực tiếp không
        return this.todos.some(todo => todo.parentId === parentId);
    }

    hasIncompleteChildren(parentId) {
        // Kiểm tra xem todo có children chưa hoàn thành không (không tính skip)
        const children = this.todos.filter(todo => todo.parentId === parentId);
        return children.some(child => !child.completed && !child.skipped);
    }

    isLeafNode(todoId) {
        // Kiểm tra xem todo có phải là node lá (có parent nhưng không có con)
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo || !todo.parentId) return false; // Không phải con hoặc không tồn tại
        return !this.hasChildren(todoId); // Có parent nhưng không có con
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
            // Calculate correct order based on siblings in the same project
            const siblings = this.todos.filter(t => t.parentId === parentId && t.projectId === parentTodo.projectId);
            const order = siblings.length;
            
            const todo = {
                id: this.generateId(),
                text: text.trim(),
                completed: false,
                createdAt: new Date().toISOString(),
                parentId: parentId,
                level: parentLevel + 1,
                order: order,
                projectId: parentTodo.projectId,
                timeBlocks: 1, // Default 1 block (5 phút)
                skipped: false // Default not skipped
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



    // Start parent selection mode
    startParentSelection(childId) {
        this.parentSelectionMode = true;
        this.selectedChildId = childId;
        document.body.classList.add('parent-selection-mode');
        this.render();
        this.showMessage('Chọn todo cha cho todo này', 'info');
    }

    // Start priority selection mode
    startPrioritySelection(todoId) {
        this.selectedPriorityTodoId = todoId;
        this.prioritySelectionMode = true;
        document.body.classList.add('priority-selection-mode');
        this.render();
        this.showMessage('Chọn todo anh em để đưa todo hiện tại lên trên', 'info');
    }

    // Cancel parent selection mode
    cancelParentSelection() {
        this.parentSelectionMode = false;
        this.selectedChildId = null;
        document.body.classList.remove('parent-selection-mode');
        this.render();
    }

    // Cancel priority selection mode
    cancelPrioritySelection() {
        this.prioritySelectionMode = false;
        this.selectedPriorityTodoId = null;
        document.body.classList.remove('priority-selection-mode');
        this.render();
    }

    // Select parent for child
    selectParent(parentId) {
        if (!this.parentSelectionMode || !this.selectedChildId) return;
        
        const childId = this.selectedChildId;
        
        // Check if trying to select self as parent
        if (parentId === childId) {
            this.showMessage('Không thể chọn chính nó làm cha!', 'warning');
            return;
        }
        
        // Check if trying to select descendant as parent
        if (this.isDescendant(childId, parentId)) {
            this.showMessage('Không thể chọn con/cháu làm cha!', 'warning');
            return;
        }
        
        // Make the relationship
        this.makeChildOf(childId, parentId);
        this.cancelParentSelection();
        this.saveTodos();
        this.render();
        this.showMessage('Đã tạo quan hệ cha-con thành công!', 'success');
    }

    // Select priority position
    selectPriority(targetTodoId) {
        if (!this.prioritySelectionMode || !this.selectedPriorityTodoId) return;
        
        const selectedTodo = this.todos.find(t => t.id === this.selectedPriorityTodoId);
        const targetTodo = this.todos.find(t => t.id === targetTodoId);
        
        if (!selectedTodo || !targetTodo) return;
        
        console.log('Priority selection:', {
            selected: selectedTodo.text,
            target: targetTodo.text,
            selectedOrder: selectedTodo.order,
            targetOrder: targetTodo.order
        });
        
        // Kiểm tra xem 2 todo có cùng parent không (anh em)
        if (selectedTodo.parentId !== targetTodo.parentId) {
            this.showMessage('Chỉ có thể sắp xếp với todo anh em (cùng cha)!', 'warning');
            return;
        }
        
        // Lấy order của target todo
        const targetOrder = targetTodo.order;
        
        // Cập nhật order của selected todo để đưa lên trên target
        selectedTodo.order = targetOrder - 0.5;
        
        console.log('After order update:', {
            selectedNewOrder: selectedTodo.order
        });
        
        // Chuẩn hóa lại order cho tất cả siblings
        this.normalizeOrderForSiblings(selectedTodo.parentId, selectedTodo.projectId);
        
        console.log('After normalize:', {
            siblings: this.todos
                .filter(t => t.parentId === selectedTodo.parentId && t.projectId === selectedTodo.projectId)
                .map(t => ({ text: t.text, order: t.order }))
                .sort((a, b) => a.order - b.order)
        });
        
        this.saveTodos();
        this.cancelPrioritySelection();
        this.render();
        this.showMessage('Đã sắp xếp thứ tự ưu tiên!', 'success');
    }

    // Normalize order for siblings to ensure integer sequence
    normalizeOrderForSiblings(parentId, projectId) {
        const siblings = this.todos
            .filter(t => t.parentId === parentId && t.projectId === projectId)
            .sort((a, b) => a.order - b.order);
        
        siblings.forEach((todo, index) => {
            todo.order = index;
        });
    }

    // Assign proper order to all todos based on their creation time
    assignOrderToAllTodos(todos) {
        // Group by parentId and projectId
        const groups = new Map();
        
        todos.forEach(todo => {
            const key = `${todo.parentId || 'root'}-${todo.projectId}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(todo);
        });
        
        // Sort each group by createdAt and assign order
        groups.forEach(siblings => {
            siblings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            siblings.forEach((todo, index) => {
                todo.order = index;
            });
        });
    }

    // Check if childId is descendant of parentId
    isDescendant(parentId, childId) {
        const child = this.todos.find(t => t.id === childId);
        if (!child || !child.parentId) return false;
        
        if (child.parentId === parentId) return true;
        return this.isDescendant(parentId, child.parentId);
    }

    // Make childId a child of parentId
    makeChildOf(childId, parentId) {
        const child = this.todos.find(t => t.id === childId);
        const parent = this.todos.find(t => t.id === parentId);
        
        if (!child || !parent) return;

        // Update child info
        const oldParentId = child.parentId;
        child.parentId = parentId;
        child.level = parent.level + 1;
        child.projectId = parent.projectId; // Move child to parent's project

        // Update order for new siblings
        const newSiblings = this.todos.filter(t => t.parentId === parentId && t.id !== childId && t.projectId === parent.projectId);
        child.order = newSiblings.length;

        // Update order for old siblings
        if (oldParentId !== null) {
            const oldSiblings = this.todos.filter(t => t.parentId === oldParentId && t.projectId === child.projectId);
            oldSiblings.forEach((sibling, index) => {
                sibling.order = index;
            });
        }

        // Update level and project for all children of child
        this.updateChildrenLevel(childId);
    }

    // Update children level recursively
    updateChildrenLevel(parentId) {
        const parent = this.todos.find(t => t.id === parentId);
        if (!parent) return;

        const children = this.todos.filter(t => t.parentId === parentId);
        children.forEach(child => {
            child.level = parent.level + 1;
            child.projectId = parent.projectId; // Update project for children
            this.updateChildrenLevel(child.id);
        });
    }

    // Make todo a root (remove parent relationship)
    makeRoot(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;

        // Check if already a root
        if (todo.parentId === null) {
            this.showMessage('Todo này đã là root rồi!', 'warning');
            return;
        }

        // Update todo to be root
        const oldParentId = todo.parentId;
        todo.parentId = null;
        todo.level = 0;

        // Update order for old siblings
        const oldSiblings = this.todos.filter(t => t.parentId === oldParentId);
        oldSiblings.forEach((sibling, index) => {
            sibling.order = index;
        });

        // Set new order for root level
        const rootTodos = this.todos.filter(t => t.parentId === null && t.id !== todoId);
        todo.order = rootTodos.length;

        // Update level for all children of this todo
        this.updateChildrenLevel(todoId);

        this.saveTodos();
        this.render();
        this.showMessage('Đã chuyển todo thành root!', 'success');
    }

    // Toggle collapse/uncollapse for todo children
    toggleCollapse(todoId) {
        if (this.collapsedTodos.has(todoId)) {
            this.collapsedTodos.delete(todoId);
        } else {
            this.collapsedTodos.add(todoId);
        }
        this.render(); // Render lại toàn bộ danh sách để ẩn/hiện children
    }

    // Toggle collapse all todos (chỉ hiển thị todo cha)
    toggleCollapseAll() {
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        const icon = collapseAllBtn.querySelector('i');
        const textSpan = collapseAllBtn.querySelector('span');
        
        // Kiểm tra xem có todo nào đang collapsed không
        const hasCollapsedTodos = this.collapsedTodos.size > 0;
        
        if (hasCollapsedTodos) {
            // Nếu có todo collapsed, mở rộng tất cả
            this.collapsedTodos.clear();
            icon.className = 'fas fa-compress-alt';
            collapseAllBtn.title = 'Thu gọn tất cả';
            textSpan.textContent = 'Thu gọn';
        } else {
            // Nếu không có todo nào collapsed, thu gọn tất cả todo có children
            const todosWithChildren = this.todos.filter(todo => this.hasChildren(todo.id));
            todosWithChildren.forEach(todo => {
                this.collapsedTodos.add(todo.id);
            });
            icon.className = 'fas fa-expand-alt';
            collapseAllBtn.title = 'Mở rộng tất cả';
            textSpan.textContent = 'Mở rộng';
        }
        
        this.render(); // Render lại để áp dụng thay đổi
    }

    // Check if todo is collapsed
    isCollapsed(todoId) {
        return this.collapsedTodos.has(todoId);
    }

    // Duplicate todo and all its children
    duplicateTodo(todoId) {
        const originalTodo = this.todos.find(t => t.id === todoId);
        if (!originalTodo) return;

        // Tạo mapping để theo dõi ID cũ và mới
        const idMapping = new Map();
        
        // Tạo todo gốc được copy, giữ nguyên parent nếu có
        const duplicatedTodo = this.createDuplicatedTodo(originalTodo, originalTodo.parentId, true);
        idMapping.set(todoId, duplicatedTodo.id);
        
        // Copy tất cả children theo đúng phân cấp
        this.duplicateChildren(todoId, duplicatedTodo.id, idMapping);
        
        this.saveTodos();
        this.render();
        this.showMessage(`Đã nhân bản "${originalTodo.text}" và ${this.getChildrenCount(todoId)} công việc con!`, 'success');
    }

    // Tạo todo được copy với suffix "copied" (chỉ cho todo gốc)
    createDuplicatedTodo(originalTodo, newParentId, isRoot = false) {
        const newTodo = {
            id: this.generateId(),
            text: isRoot ? originalTodo.text + ' copied' : originalTodo.text,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
            parentId: newParentId,
            projectId: originalTodo.projectId,
            level: newParentId ? (this.todos.find(t => t.id === newParentId)?.level || 0) + 1 : 0,
            order: this.getNextOrder(originalTodo.projectId, newParentId),
            timeBlocks: originalTodo.timeBlocks || 1,
            skipped: false // Default not skipped
        };
        
        this.todos.push(newTodo);
        return newTodo;
    }

    // Copy tất cả children theo đúng phân cấp
    duplicateChildren(originalParentId, newParentId, idMapping) {
        const children = this.todos.filter(t => t.parentId === originalParentId);
        
        children.forEach(child => {
            // Tạo child mới (không phải root nên không có suffix "copied")
            const newChild = this.createDuplicatedTodo(child, newParentId, false);
            idMapping.set(child.id, newChild.id);
            
            // Đệ quy copy children của child này
            this.duplicateChildren(child.id, newChild.id, idMapping);
        });
    }

    // Lấy order tiếp theo cho todo mới
    getNextOrder(projectId, parentId) {
        const siblings = this.todos.filter(t => t.projectId === projectId && t.parentId === parentId);
        return siblings.length;
    }

    // Tạo ID mới cho todo
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // Kiểm tra tất cả children và grandchildren đã hoàn thành
    areAllChildrenCompleted(todoId) {
        const children = this.todos.filter(t => t.parentId === todoId);
        if (children.length === 0) return true; // Không có children thì coi như completed
        
        // Kiểm tra tất cả children đã completed (không tính skip)
        const nonSkippedChildren = children.filter(child => !child.skipped);
        if (nonSkippedChildren.length === 0) return true; // Chỉ có skip children
        
        const allChildrenCompleted = nonSkippedChildren.every(child => {
            if (!child.completed) return false;
            // Đệ quy kiểm tra grandchildren
            return this.areAllChildrenCompleted(child.id);
        });
        
        return allChildrenCompleted;
    }

    // Tính tỷ lệ hoàn thành của children (trả về {completed: số, total: số})
    getChildrenCompletionRatio(todoId) {
        // Tính ratio cho tất cả children (không phụ thuộc filter) để giữ thống kê
        const children = this.todos.filter(t => t.parentId === todoId);
        const nonSkippedChildren = children.filter(t => !t.skipped); // Không tính skip
        
        if (nonSkippedChildren.length === 0) return { completed: 0, total: 0 };
        
        let completed = 0;
        let total = nonSkippedChildren.length;
        
        nonSkippedChildren.forEach(child => {
            if (child.completed) {
                completed++;
            }
            // Đệ quy tính grandchildren
            const grandchildRatio = this.getChildrenCompletionRatio(child.id);
            completed += grandchildRatio.completed;
            total += grandchildRatio.total;
        });
        
        return { completed, total };
    }

    // Tạo nội dung hiển thị cho children-count
    getChildrenCountDisplay(todoId) {
        const ratio = this.getChildrenCompletionRatio(todoId);
        const total = ratio.total;
        const completed = ratio.completed;
        
        // Nếu không có children hoặc tất cả đã hoàn thành hoặc chưa có cái nào hoàn thành
        if (total === 0 || completed === 0 || completed === total) {
            return this.getChildrenCount(todoId);
        }
        
        // Nếu có một phần hoàn thành, hiển thị tỷ lệ
        return `${completed}/${total}`;
    }

    // Kiểm tra có nên hiển thị tỷ lệ hoàn thành không
    shouldShowCompletionRatio(todoId) {
        const ratio = this.getChildrenCompletionRatio(todoId);
        const total = ratio.total;
        const completed = ratio.completed;
        
        // Hiển thị tỷ lệ khi có children và có một phần hoàn thành (không phải 0 hoặc 100%)
        return total > 0 && completed > 0 && completed < total;
    }

    // Check if todo should be hidden (parent is collapsed)
    isHiddenByCollapse(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo || !todo.parentId) return false;
        
        // Check if any parent is collapsed
        let currentParentId = todo.parentId;
        while (currentParentId) {
            if (this.collapsedTodos.has(currentParentId)) {
                return true;
            }
            const parent = this.todos.find(t => t.id === currentParentId);
            currentParentId = parent ? parent.parentId : null;
        }
        return false;
    }

    // Project Management Methods
    createProject() {
        const projectName = prompt('Nhập tên project mới:');
        
        // Kiểm tra nếu user ấn Cancel (projectName = null)
        if (projectName === null) {
            return; // Không hiển thị thông báo lỗi khi Cancel
        }
        
        if (!projectName || !projectName.trim()) {
            this.showMessage('Tên project không được để trống!', 'warning');
            return;
        }

        if (projectName.trim().length > 50) {
            this.showMessage('Tên project quá dài (tối đa 50 ký tự)!', 'warning');
            return;
        }

        const project = {
            id: this.generateId(),
            name: projectName.trim(),
            createdAt: new Date().toISOString(),
            color: this.getRandomProjectColor()
        };

        this.projects.push(project);
        this.currentProjectId = project.id;
        this.saveProjects();
        this.saveCurrentProject();
        this.render();
        this.showMessage('Đã tạo project mới!', 'success');
    }

    deleteProject(projectId) {
        if (this.projects.length <= 1) {
            this.showMessage('Không thể xóa project cuối cùng!', 'warning');
            return;
        }

        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        if (confirm(`Bạn có chắc muốn xóa project "${project.name}" và tất cả todos trong đó?`)) {
            // Delete all todos in this project
            this.todos = this.todos.filter(t => t.projectId !== projectId);
            
            // Delete project
            this.projects = this.projects.filter(p => p.id !== projectId);
            
            // Switch to first available project
            this.currentProjectId = this.projects[0].id;
            
            this.saveProjects();
            this.saveCurrentProject();
            this.saveTodos();
            this.render();
            this.updateStats();
            this.showMessage('Đã xóa project!', 'success');
        }
    }

    editProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const newName = prompt('Nhập tên project mới:', project.name);
        if (newName !== null && newName.trim() !== '') {
            if (newName.trim().length > 50) {
                this.showMessage('Tên project quá dài (tối đa 50 ký tự)!', 'warning');
                return;
            }
            
            project.name = newName.trim();
            this.saveProjects();
            this.render();
            this.showMessage('Đã cập nhật tên project!', 'success');
        }
    }


    archiveProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        if (confirm(`Bạn có chắc muốn lưu trữ project "${project.name}"?`)) {
            // Đánh dấu project là archived
            if (!project.archived) {
                project.archived = true;
                project.archivedAt = new Date().toISOString();
            } else {
                // Nếu đã archived thì unarchive
                project.archived = false;
                delete project.archivedAt;
            }
            
            this.saveProjects();
            this.render();
            const message = project.archived ? 'Đã lưu trữ project!' : 'Đã khôi phục project!';
            this.showMessage(message, 'success');
        }
    }

    showArchivedProjects() {
        const archivedProjects = this.projects.filter(p => p.archived);
        
        if (archivedProjects.length === 0) {
            this.showMessage('Không có project nào đã được lưu trữ.', 'info');
            return;
        }

        // Tạo modal để hiển thị danh sách archived projects
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content archived-projects-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-archive"></i> Project đã lưu trữ</h3>
                    <button class="modal-close-btn" onclick="todoApp.closeModal(this.closest('.modal-overlay'))">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="archived-projects-list">
                        ${archivedProjects.map(project => {
                            const projectTodos = this.todos.filter(t => t.projectId === project.id);
                            const completedCount = projectTodos.filter(t => t.completed).length;
                            const skippedCount = projectTodos.filter(t => t.skipped).length;
                            const totalCount = projectTodos.length;
                            const archivedDate = new Date(project.archivedAt).toLocaleDateString('vi-VN');
                            
                            return `
                                <div class="archived-project-item">
                                    <div class="archived-project-info">
                                        <h4>${project.name}</h4>
                                        <p class="archived-project-stats">
                                            ${totalCount} công việc • ${completedCount} đã hoàn thành${skippedCount > 0 ? ` • ${skippedCount} bị skip` : ''}
                                        </p>
                                        <p class="archived-date">
                                            <i class="fas fa-calendar"></i> Lưu trữ ngày: ${archivedDate}
                                        </p>
                                    </div>
                                    <div class="archived-project-actions">
                                        <button class="btn-restore" onclick="todoApp.restoreProject('${project.id}'); todoApp.closeModal(this.closest('.modal-overlay'));" title="Khôi phục project">
                                            <i class="fas fa-undo"></i> Khôi phục
                                        </button>
                                        <button class="btn-delete" onclick="todoApp.deleteArchivedProject('${project.id}'); todoApp.closeModal(this.closest('.modal-overlay'));" title="Xóa vĩnh viễn">
                                            <i class="fas fa-trash"></i> Xóa
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Đóng modal khi click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    closeModal(modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.remove();
        }, 300); // Match animation duration
    }

    restoreProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        project.archived = false;
        delete project.archivedAt;
        this.saveProjects();
        this.render();
        this.showMessage(`Đã khôi phục project "${project.name}"!`, 'success');
    }

    deleteArchivedProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        if (confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN project "${project.name}" và tất cả công việc bên trong?\n\nHành động này không thể hoàn tác!`)) {
            // Xóa tất cả todos thuộc project này
            this.todos = this.todos.filter(t => t.projectId !== projectId);
            
            // Xóa project
            this.projects = this.projects.filter(p => p.id !== projectId);
            
            // Nếu đang ở project bị xóa, chuyển sang project khác
            if (this.currentProjectId === projectId) {
                const remainingProjects = this.projects.filter(p => !p.archived);
                if (remainingProjects.length > 0) {
                    this.currentProjectId = remainingProjects[0].id;
                } else {
                    this.currentProjectId = null;
                }
                this.saveCurrentProject();
            }
            
            this.saveTodos();
            this.saveProjects();
            this.render();
            this.showMessage(`Đã xóa vĩnh viễn project "${project.name}"!`, 'success');
        }
    }

    switchProject(projectId) {
        this.currentProjectId = projectId;
        this.saveCurrentProject();
        this.render();
        this.updateStats();
    }

    getCurrentProject() {
        return this.projects.find(p => p.id === this.currentProjectId);
    }

    getProjectTodos() {
        return this.todos.filter(t => t.projectId === this.currentProjectId);
    }

    getFilteredTodosForProject(projectId) {
        // Get all todos that belong to this project
        const projectTodos = this.todos.filter(t => t.projectId === projectId);
        
        // First, get todos that match the current filter
        let matchingTodos = [];
        switch (this.currentFilter) {
            case 'pending':
                // Hiển thị todo chưa hoàn thành + todo đã hoàn thành trong 24h gần nhất
                const now = new Date();
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                matchingTodos = projectTodos.filter(t => {
                    if (!t.completed && !t.skipped) {
                        return true; // Todo chưa hoàn thành
                    }
                    if (t.completed && t.completedAt) {
                        const completedDate = new Date(t.completedAt);
                        return completedDate >= oneDayAgo; // Todo hoàn thành trong 24h gần nhất
                    }
                    return false;
                });
                break;
            default: // 'all'
                matchingTodos = projectTodos; // Hiển thị tất cả (completed, pending, skipped)
        }
        
        // Create a set to track all todos we need to show (including parents)
        const todosToShow = new Set();
        
        // Add all matching todos
        matchingTodos.forEach(todo => todosToShow.add(todo.id));
        
        // For each matching todo, add all its parents to maintain hierarchy
        matchingTodos.forEach(todo => {
            let currentParentId = todo.parentId;
            while (currentParentId) {
                const parent = this.todos.find(t => t.id === currentParentId);
                if (parent && parent.projectId === projectId) {
                    todosToShow.add(parent.id);
                    currentParentId = parent.parentId;
                } else {
                break;
        }
            }
        });
        
        // Get the final filtered list
        let filtered = this.todos.filter(t => todosToShow.has(t.id));
        
        // Apply search filter
        if (this.searchQuery) {
            // Filter by search query first
            const searchFiltered = filtered.filter(todo => 
                todo.text.toLowerCase().includes(this.searchQuery)
            );
            
            // Create new set for search results
            const searchResults = new Set();
            
            // Add all search matching todos
            searchFiltered.forEach(todo => searchResults.add(todo.id));
            
            // Add all parents of search matching todos to maintain hierarchy
            searchFiltered.forEach(todo => {
                let currentParentId = todo.parentId;
                while (currentParentId) {
                    const parent = this.todos.find(t => t.id === currentParentId);
                    if (parent && parent.projectId === projectId) {
                        searchResults.add(parent.id);
                        currentParentId = parent.parentId;
                    } else {
                        break;
                    }
                }
            });
            
            // Update filtered to only include search results
            filtered = this.todos.filter(t => searchResults.has(t.id));
        }
        
        // Sắp xếp theo cấu trúc phân cấp
        const sortedTodos = this.sortTodosHierarchically(filtered);
        
        // Filter out collapsed children
        return sortedTodos.filter(todo => !this.isHiddenByCollapse(todo.id));
    }

    getRandomProjectColor() {
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    loadProjects() {
        try {
            const saved = localStorage.getItem('projects');
            if (saved) {
                return JSON.parse(saved);
            } else {
                // Create default project
                return [{
                    id: 'default',
                    name: 'Project Mặc Định',
                    createdAt: new Date().toISOString(),
                    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }];
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            return [{
                id: 'default',
                name: 'Project Mặc Định',
                createdAt: new Date().toISOString(),
                color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }];
        }
    }

    saveProjects() {
        try {
            // Thêm timestamp cho mỗi project khi save
            const projectsWithTimestamp = this.projects.map(project => ({
                ...project,
                lastUpdated: new Date().toISOString()
            }));
            
            localStorage.setItem('projects', JSON.stringify(projectsWithTimestamp));
            this.projects = projectsWithTimestamp; // Cập nhật lại projects với timestamp
            
            // Đồng bộ với Firebase nếu đã đăng nhập
            if (this.isAuthenticated) {
                this.saveUserData();
            }
        } catch (error) {
            console.error('Error saving projects:', error);
        }
    }

    loadCurrentProject() {
        try {
            const saved = localStorage.getItem('currentProjectId');
            return saved || 'default';
        } catch (error) {
            console.error('Error loading current project:', error);
            return 'default';
        }
    }

    saveCurrentProject() {
        try {
            localStorage.setItem('currentProjectId', this.currentProjectId);
            // Đồng bộ với Firebase nếu đã đăng nhập
            if (this.isAuthenticated) {
                this.saveUserData();
            }
        } catch (error) {
            console.error('Error saving current project:', error);
        }
    }

    renderProjects() {
        const projectsContainer = document.getElementById('projectsContainer');
        if (!projectsContainer) return;

        projectsContainer.innerHTML = this.projects.map(project => {
            const projectTodos = this.todos.filter(t => t.projectId === project.id);
            const completedCount = projectTodos.filter(t => t.completed).length;
            const totalCount = projectTodos.length;
            const isActive = project.id === this.currentProjectId;

            return `
                <div class="project-card ${isActive ? 'active' : ''}" 
                     onclick="todoApp.switchProject('${project.id}')">
                    <div class="project-header" style="background: ${project.color}">
                        <h3 class="project-title">${project.name}</h3>
                        ${this.projects.length > 1 ? `
                            <button class="project-delete-btn" 
                                    onclick="event.stopPropagation(); todoApp.deleteProject('${project.id}')" 
                                    title="Xóa project">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="project-stats">
                        <div class="project-todo-count">
                            ${totalCount} công việc • ${completedCount} xong
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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

    updateFilterButtons() {
        const allTodos = this.todos;
        const totalCount = allTodos.length;
        
        // Đếm pending: todo chưa hoàn thành + todo hoàn thành trong 24h gần nhất
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const pendingCount = allTodos.filter(t => {
            if (!t.completed && !t.skipped) {
                return true; // Todo chưa hoàn thành
            }
            if (t.completed && t.completedAt) {
                const completedDate = new Date(t.completedAt);
                return completedDate >= oneDayAgo; // Todo hoàn thành trong 24h gần nhất
            }
            return false;
        }).length;
        
        const completedCount = allTodos.filter(t => t.completed).length;
        
        // Update filter button texts with counts
        const allBtn = document.querySelector('[data-filter="all"]');
        const pendingBtn = document.querySelector('[data-filter="pending"]');
        const completedBtn = document.querySelector('[data-filter="completed"]');
        
        if (allBtn) {
            allBtn.innerHTML = `<i class="fas fa-list"></i> Tất cả (${totalCount})`;
        }
        if (pendingBtn) {
            pendingBtn.innerHTML = `<i class="fas fa-clock"></i> Còn (${pendingCount})`;
        }
        if (completedBtn) {
            completedBtn.innerHTML = `<i class="fas fa-check"></i> Xong (${completedCount})`;
        }
    }


    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase().trim();
        const clearBtn = document.getElementById('clearSearch');
        const searchInput = document.getElementById('searchInput');
        
        if (this.searchQuery) {
            clearBtn.classList.add('show');
        } else {
            clearBtn.classList.remove('show');
        }
        
        this.render();
        this.updateStats();
    }

    clearSearch() {
        this.searchQuery = '';
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearch');
        
        searchInput.value = '';
        clearBtn.classList.remove('show');
        
        this.render();
        this.updateStats();
    }

    handleKeyboardShortcuts(e) {
        // Prevent shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT') {
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }

        switch (e.key) {
            case '/':
                e.preventDefault();
                document.getElementById('searchInput').focus();
                break;
            case 'n':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    document.getElementById('todoInput').focus();
                }
                break;
            case 'Escape':
                this.clearSearch();
                this.selectedTodos.clear();
                this.render();
                break;
            case 'a':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.selectAllVisible();
                }
                break;
            case 'Delete':
            case 'Backspace':
                if (this.selectedTodos.size > 0) {
                    e.preventDefault();
                    this.deleteSelected();
                }
                break;
        }
    }

    selectAllVisible() {
        const filteredTodos = this.getFilteredTodos();
        this.selectedTodos.clear();
        filteredTodos.forEach(todo => {
            this.selectedTodos.add(todo.id);
        });
        this.render();
        this.showMessage(`Đã chọn ${this.selectedTodos.size} công việc`, 'info');
    }

    deleteSelected() {
        if (this.selectedTodos.size === 0) return;
        
        if (confirm(`Bạn có chắc muốn xóa ${this.selectedTodos.size} công việc đã chọn?`)) {
            const selectedArray = Array.from(this.selectedTodos);
            selectedArray.forEach(id => {
                const todosToDelete = this.getAllChildren(id);
                todosToDelete.push(id);
                this.todos = this.todos.filter(t => !todosToDelete.includes(t.id));
            });
            
            this.selectedTodos.clear();
            this.saveTodos();
            this.render();
            this.updateStats();
            this.showMessage(`Đã xóa ${selectedArray.length} công việc!`, 'success');
        }
    }

    highlightSearchTerm(text) {
        if (!this.searchQuery) return this.escapeHtml(text);
        
        const escaped = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeHtml(this.searchQuery)})`, 'gi');
        return escaped.replace(regex, '<span class="search-highlight">$1</span>');
    }

    getFilteredTodos() {
        // Get all todos for current project
        const projectTodos = this.todos.filter(t => t.projectId === this.currentProjectId);
        
        // First, get todos that match the current filter
        let matchingTodos = [];
        switch (this.currentFilter) {
            case 'pending':
                // Hiển thị todo chưa hoàn thành + todo đã hoàn thành trong 24h gần nhất
                const now = new Date();
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                matchingTodos = projectTodos.filter(t => {
                    if (!t.completed && !t.skipped) {
                        return true; // Todo chưa hoàn thành
                    }
                    if (t.completed && t.completedAt) {
                        const completedDate = new Date(t.completedAt);
                        return completedDate >= oneDayAgo; // Todo hoàn thành trong 24h gần nhất
                    }
                    return false;
                });
                break;
            default: // 'all'
                matchingTodos = projectTodos; // Hiển thị tất cả (completed, pending, skipped)
        }
        
        // Create a set to track all todos we need to show (including parents)
        const todosToShow = new Set();
        
        // Add all matching todos
        matchingTodos.forEach(todo => todosToShow.add(todo.id));
        
        // For each matching todo, add all its parents to maintain hierarchy
        matchingTodos.forEach(todo => {
            let currentParentId = todo.parentId;
            while (currentParentId) {
                const parent = this.todos.find(t => t.id === currentParentId);
                if (parent && parent.projectId === this.currentProjectId) {
                    todosToShow.add(parent.id);
                    currentParentId = parent.parentId;
                } else {
                break;
        }
            }
        });
        
        // Get the final filtered list
        let filtered = this.todos.filter(t => todosToShow.has(t.id));
        
        // Apply search filter
        if (this.searchQuery) {
            // Filter by search query first
            const searchFiltered = filtered.filter(todo => 
                todo.text.toLowerCase().includes(this.searchQuery)
            );
            
            // Create new set for search results
            const searchResults = new Set();
            
            // Add all search matching todos
            searchFiltered.forEach(todo => searchResults.add(todo.id));
            
            // Add all parents of search matching todos to maintain hierarchy
            searchFiltered.forEach(todo => {
                let currentParentId = todo.parentId;
                while (currentParentId) {
                    const parent = this.todos.find(t => t.id === currentParentId);
                    if (parent && parent.projectId === this.currentProjectId) {
                        searchResults.add(parent.id);
                        currentParentId = parent.parentId;
                    } else {
                        break;
                    }
                }
            });
            
            // Update filtered to only include search results
            filtered = this.todos.filter(t => searchResults.has(t.id));
        }
        
        // Sắp xếp theo cấu trúc phân cấp
        const sortedTodos = this.sortTodosHierarchically(filtered);
        
        // Filter out collapsed children
        return sortedTodos.filter(todo => !this.isHiddenByCollapse(todo.id));
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

    render(forceFullRender = false) {
        const multiProjectContainer = document.getElementById('multiProjectContainer');
        const emptyState = document.getElementById('emptyState');
        
        // Lưu vị trí scroll trước khi render
        const scrollPositions = this.saveScrollPositions();
        
        // Check if any non-archived project has todos (or if showing archived filter)
        const hasAnyTodos = this.projects.filter(project => !project.archived).some(project => {
            const projectTodos = this.todos.filter(t => t.projectId === project.id);
            return projectTodos.length > 0;
        }) || this.currentFilter === 'archived';

        if (!hasAnyTodos) {
            multiProjectContainer.innerHTML = '';
            emptyState.classList.add('show');
            return;
        }

        emptyState.classList.remove('show');
        
        // Render todos for each project (excluding archived projects, unless showing archived filter)
        const projectsToRender = this.currentFilter === 'archived' 
            ? this.projects.filter(project => !project.archived) 
            : this.projects.filter(project => !project.archived);
            
        multiProjectContainer.innerHTML = projectsToRender.map(project => {
            const projectTodos = this.todos.filter(t => t.projectId === project.id);
            const filteredProjectTodos = this.getFilteredTodosForProject(project.id);
            
            if (filteredProjectTodos.length === 0) {
                return `
                    <div class="project-column" data-project-id="${project.id}">
                        <div class="project-header-small" style="background: ${project.color}">
                            <div class="project-header-content">
                                <h3 class="project-title-small">${project.name} <span class="project-todo-count-small">(${projectTodos.length})</span></h3>
                            </div>
                            <div class="project-actions">
                                <button class="add-todo-btn" onclick="todoApp.addTodoToProject('${project.id}')" title="Thêm công việc mới">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <div class="project-management-actions">
                                    <button class="project-action-btn edit-project-btn" onclick="todoApp.editProject('${project.id}')" title="Chỉnh sửa project">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="project-action-btn archive-project-btn" onclick="todoApp.archiveProject('${project.id}')" title="Lưu trữ project">
                                        <i class="fas fa-archive"></i>
                                    </button>
                                    ${this.projects.length > 1 ? `
                                        <button class="project-action-btn delete-project-btn" onclick="todoApp.deleteProject('${project.id}')" title="Xóa project">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="todo-list">
                            <div class="empty-project">
                                <i class="fas fa-clipboard-list"></i>
                                <p>Chưa có công việc</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            const todosHtml = filteredProjectTodos.map(todo => {
                // Check if this todo can be selected as parent
                let canBeParent = true;
                let parentSelectionClass = '';
                
                if (this.parentSelectionMode && this.selectedChildId) {
                    if (todo.id === this.selectedChildId) {
                        canBeParent = false;
                        parentSelectionClass = 'parent-selection-child';
                    } else if (this.isDescendant(this.selectedChildId, todo.id)) {
                        canBeParent = false;
                        parentSelectionClass = 'parent-selection-descendant';
                    } else {
                        parentSelectionClass = 'parent-selection-available';
                    }
                }

                // Check if this todo can be selected for priority
                let canBePriorityTarget = false;
                let prioritySelectionClass = '';
                
                if (this.prioritySelectionMode && this.selectedPriorityTodoId) {
                    const selectedTodo = this.todos.find(t => t.id === this.selectedPriorityTodoId);
                    if (todo.id === this.selectedPriorityTodoId) {
                        prioritySelectionClass = 'priority-selection-selected';
                    } else if (selectedTodo && todo.parentId === selectedTodo.parentId) {
                        canBePriorityTarget = true;
                        prioritySelectionClass = 'priority-selection-available';
                    } else {
                        prioritySelectionClass = 'priority-selection-unavailable';
                    }
                }
                
                return `
                <div class="todo-item ${todo.level > 0 ? `level-${todo.level}` : ''} ${parentSelectionClass} ${prioritySelectionClass}" data-id="${todo.id}" 
                     ${this.parentSelectionMode && canBeParent ? `onclick="todoApp.selectParent('${todo.id}')"` : ''}
                     ${this.prioritySelectionMode && canBePriorityTarget ? `onclick="todoApp.selectPriority('${todo.id}')"` : ''}>
                    <div class="todo-content">
                        ${this.renderTodoCheckbox(todo)}
                        <div class="todo-text ${todo.completed ? 'completed' : ''} ${todo.skipped ? 'skipped' : ''}" 
                             ondblclick="todoApp.editTodo('${todo.id}')">
                            <span class="todo-text-content">${this.highlightSearchTerm(todo.text)}</span>
                            ${this.hasChildren(todo.id) ? `
                                <span class="children-count ${this.isCollapsed(todo.id) ? 'collapsed' : 'expanded'} ${this.areAllChildrenCompleted(todo.id) ? 'all-completed' : ''} ${this.shouldShowCompletionRatio(todo.id) ? 'partial-completed' : ''}" 
                                      onclick="todoApp.toggleCollapse('${todo.id}')" 
                                      title="${this.isCollapsed(todo.id) ? 'Nhấn để mở rộng' : 'Nhấn để thu gọn'}">
                                    <i class="fas fa-chevron-${this.isCollapsed(todo.id) ? 'right' : 'down'}"></i>
                                    ${this.getChildrenCountDisplay(todo.id)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                `;
            }).join('');
            
            return `
                <div class="project-column" data-project-id="${project.id}">
                    <div class="project-header-small" style="background: ${project.color}">
                        <div class="project-header-content">
                            <h3 class="project-title-small">${project.name} <span class="project-todo-count-small">(${projectTodos.length})</span></h3>
                        </div>
                        <div class="project-actions">
                            <button class="add-todo-btn" onclick="todoApp.addTodoToProject('${project.id}')" title="Thêm công việc mới">
                                <i class="fas fa-plus"></i>
                            </button>
                            <div class="project-management-actions">
                                <button class="project-action-btn edit-project-btn" onclick="todoApp.editProject('${project.id}')" title="Chỉnh sửa project">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="project-action-btn archive-project-btn" onclick="todoApp.archiveProject('${project.id}')" title="Lưu trữ project">
                                    <i class="fas fa-archive"></i>
                                </button>
                                ${this.projects.length > 1 ? `
                                    <button class="project-action-btn delete-project-btn" onclick="todoApp.deleteProject('${project.id}')" title="Xóa project">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="todo-list">
                        ${todosHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        // Khôi phục vị trí scroll sau khi render
        setTimeout(() => {
            this.restoreScrollPositions(scrollPositions);
        }, 10);
    }

    updateStats() {
        // Update filter buttons with counts
        this.updateFilterButtons();
        
        // Update progress
        this.updateProgress();
    }

    updateProgress() {
        // Progress section đã được bỏ, không cần update
    }


    saveScrollPositions() {
        const scrollPositions = {};
        const todoLists = document.querySelectorAll('.todo-list');
        
        todoLists.forEach((todoList, index) => {
            // Lưu cả scrollTop và projectId để mapping chính xác
            const projectColumn = todoList.closest('.project-column');
            const projectId = projectColumn ? projectColumn.dataset.projectId : `project-${index}`;
            scrollPositions[projectId] = todoList.scrollTop;
        });
        
        return scrollPositions;
    }

    restoreScrollPositions(scrollPositions) {
        const todoLists = document.querySelectorAll('.todo-list');
        
        todoLists.forEach((todoList) => {
            const projectColumn = todoList.closest('.project-column');
            const projectId = projectColumn ? projectColumn.dataset.projectId : null;
            
            if (projectId && scrollPositions[projectId] !== undefined) {
                // Sử dụng requestAnimationFrame để đảm bảo DOM đã render xong
                requestAnimationFrame(() => {
                    todoList.scrollTop = scrollPositions[projectId];
                });
            }
        });
    }

    // Cập nhật chỉ todo item cụ thể thay vì render toàn bộ
    updateTodoItem(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;

        const todoElement = document.querySelector(`[data-id="${todoId}"]`);
        if (!todoElement) return;

        // Lưu vị trí scroll của project chứa todo này
        const projectColumn = todoElement.closest('.project-column');
        const projectId = projectColumn ? projectColumn.dataset.projectId : null;
        const todoList = projectColumn ? projectColumn.querySelector('.todo-list') : null;
        const scrollTop = todoList ? todoList.scrollTop : 0;

        // Tìm project của todo
        const project = this.projects.find(p => p.id === todo.projectId);
        if (!project) return;

        // Render lại todo item
        const newTodoHtml = this.renderTodoItem(todo, project);
        
        // Thay thế todo item cũ bằng mới
        todoElement.outerHTML = newTodoHtml;
        
        // Khôi phục vị trí scroll
        if (todoList) {
            requestAnimationFrame(() => {
                todoList.scrollTop = scrollTop;
            });
        }
    }

    // Render checkbox hoặc skip icon cho todo
    renderTodoCheckbox(todo) {
        if (todo.skipped) {
            return `
                <div class="todo-skip-icon" title="Đã skip">
                    <i class="fas fa-forward"></i>
                </div>
            `;
        } else {
            return `
                 <div class="todo-checkbox ${todo.completed ? 'completed' : ''} ${this.isLeafNode(todo.id) ? 'leaf-node' : ''} ${this.areAllChildrenCompleted(todo.id) ? 'all-children-completed' : ''}" 
                      onclick="event.stopPropagation(); todoApp.toggleTodo('${todo.id}')">
                     ${todo.completed ? (todo.timeBlocks > 1 ? (todo.timeBlocks === 10 ? '10' : todo.timeBlocks === 20 ? '20' : todo.timeBlocks === 30 ? '30' : todo.timeBlocks === 60 ? '1h' : todo.timeBlocks === 120 ? '2h' : todo.timeBlocks) : '<i class="fas fa-check"></i>') : ''}
                 </div>
            `;
        }
    }


    // Render một todo item riêng lẻ
    renderTodoItem(todo, project) {
        // Check if this todo can be selected as parent
        let canBeParent = true;
        let parentSelectionClass = '';
        
        if (this.parentSelectionMode && this.selectedChildId) {
            if (todo.id === this.selectedChildId) {
                canBeParent = false;
                parentSelectionClass = 'parent-selection-child';
            } else if (this.isDescendant(this.selectedChildId, todo.id)) {
                canBeParent = false;
                parentSelectionClass = 'parent-selection-descendant';
            } else {
                parentSelectionClass = 'parent-selection-available';
            }
        }
        
        return `
        <div class="todo-item ${todo.level > 0 ? `level-${todo.level}` : ''} ${parentSelectionClass}" data-id="${todo.id}" 
             ${this.parentSelectionMode && canBeParent ? `onclick="todoApp.selectParent('${todo.id}')"` : ''}>
            <div class="todo-content">
                ${this.renderTodoCheckbox(todo)}
                <div class="todo-text ${todo.completed ? 'completed' : ''} ${todo.skipped ? 'skipped' : ''}" 
                     ondblclick="todoApp.editTodo('${todo.id}')">
                    <span class="todo-text-content">${this.highlightSearchTerm(todo.text)}</span>
                    ${this.hasChildren(todo.id) ? `
                        <span class="children-count ${this.isCollapsed(todo.id) ? 'collapsed' : 'expanded'} ${this.areAllChildrenCompleted(todo.id) ? 'all-completed' : ''} ${this.shouldShowCompletionRatio(todo.id) ? 'partial-completed' : ''}" 
                              onclick="todoApp.toggleCollapse('${todo.id}')" 
                              title="${this.isCollapsed(todo.id) ? 'Nhấn để mở rộng' : 'Nhấn để thu gọn'}">
                            <i class="fas fa-chevron-${this.isCollapsed(todo.id) ? 'right' : 'down'}"></i>
                            ${this.getChildrenCountDisplay(todo.id)}
                        </span>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
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
            bottom: 20px;
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

    // Hiển thị loading message trong multi-project-container
    showLoadingMessage(message = 'Đang tải dữ liệu...') {
        const container = document.getElementById('multiProjectContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-message">
                <div class="loading-spinner">
                    <i class="fas fa-sync-alt fa-spin"></i>
                </div>
                <div class="loading-text">${message}</div>
            </div>
        `;
    }

    // Ẩn loading message
    hideLoadingMessage() {
        const container = document.getElementById('multiProjectContainer');
        if (!container) return;
        
        const loadingMessage = container.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveTodos() {
        try {
            // Thêm timestamp cho mỗi todo khi save
            const todosWithTimestamp = this.todos.map(todo => ({
                ...todo,
                lastUpdated: new Date().toISOString()
            }));
            
            localStorage.setItem('todos', JSON.stringify(todosWithTimestamp));
            this.todos = todosWithTimestamp; // Cập nhật lại todos với timestamp
            
            // Đồng bộ với Firebase nếu đã đăng nhập
            if (this.isAuthenticated) {
                this.saveUserData();
            }
        } catch (error) {
            console.error('Error saving todos:', error);
            this.showMessage('Lỗi khi lưu dữ liệu!', 'warning');
        }
    }

    loadTodos() {
        try {
            const saved = localStorage.getItem('todos');
            const todos = saved ? JSON.parse(saved) : [];
            
            // Migrate existing todos to default project if they don't have projectId
            // and add timeBlocks field if missing
            const migratedTodos = todos.map(todo => {
                if (!todo.projectId) {
                    todo.projectId = 'default';
                }
                if (!todo.timeBlocks) {
                    todo.timeBlocks = 1; // Default 1 block
                }
                if (todo.skipped === undefined) {
                    todo.skipped = false; // Default not skipped
                }
                if (todo.order === undefined) {
                    todo.order = 0; // Default order
                }
                return todo;
            });
            
            // Assign proper order for todos without order field
            const needsOrderAssignment = migratedTodos.some(todo => {
                const original = todos.find(t => t.id === todo.id);
                return original?.order === undefined;
            });
            
            if (needsOrderAssignment) {
                console.log('Assigning order to todos...');
                this.assignOrderToAllTodos(migratedTodos);
                console.log('Order assigned:', migratedTodos.map(t => ({ text: t.text, order: t.order, parentId: t.parentId })));
            }
            
            // Save migrated todos if there were changes
            if (migratedTodos.some(todo => {
                const original = todos.find(t => t.id === todo.id);
                return !original?.projectId || !original?.timeBlocks || original?.skipped === undefined || original?.order === undefined;
            })) {
                this.todos = migratedTodos;
                this.saveTodos();
            }
            
            return migratedTodos;
        } catch (error) {
            console.error('Error loading todos:', error);
            this.showMessage('Lỗi khi tải dữ liệu!', 'warning');
            return [];
        }
    }

    goToCalendar() {
        // Chuyển đến trang Calendar
        window.location.href = 'calendar.html';
    }

    // Firebase Methods
    initFirebase() {
        // Đợi Firebase được load
        let attempts = 0;
        const maxAttempts = 50; // 5 giây timeout
        
        const checkFirebase = () => {
            attempts++;
            console.log(`Checking Firebase initialization (attempt ${attempts}/${maxAttempts})`);
            
            if (window.firebaseAuth && window.firebaseDB && window.googleProvider) {
                this.firebaseAuth = window.firebaseAuth;
                this.firebaseDB = window.firebaseDB;
                this.googleProvider = window.googleProvider;
                
                    console.log('Firebase initialized successfully, setting up auth listeners');
                    this.setupAuthListeners();
            } else if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.error('Firebase initialization timeout after 5 seconds');
                this.showMessage('Firebase khởi tạo quá lâu. Vui lòng tải lại trang.', 'error');
            }
        };
        checkFirebase();
    }

    setupAuthListeners() {
        // Lắng nghe thay đổi trạng thái đăng nhập
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ onAuthStateChanged }) => {
            onAuthStateChanged(this.firebaseAuth, (user) => {
                this.user = user;
                this.isAuthenticated = !!user;
                this.handleAuthStateChange();
            });
        });
    }

    handleAuthStateChange() {
        if (this.isAuthenticated) {
            this.showMainApp();
            this.loadUserData();
        } else {
            // Kiểm tra xem có dữ liệu local không trước khi hiển thị màn đăng nhập
            const hasLocalData = this.hasLocalData();
            if (hasLocalData) {
                // Có dữ liệu local, hiển thị app ngay và load dữ liệu local
                this.showMainApp();
                this.loadLocalData();
            } else {
                // Không có dữ liệu local, hiển thị màn đăng nhập
            this.showLoginScreen();
            }
        }
    }

    checkAuthState() {
        // Kiểm tra trạng thái đăng nhập hiện tại
        if (this.firebaseAuth) {
            this.user = this.firebaseAuth.currentUser;
            this.isAuthenticated = !!this.user;
            this.handleAuthStateChange();
        }
    }

    async signInWithGoogle() {
        console.log('signInWithGoogle called');
        console.log('firebaseAuth:', this.firebaseAuth);
        console.log('googleProvider:', this.googleProvider);
        
        // Kiểm tra Firebase auth
        if (!this.firebaseAuth || !this.googleProvider) {
            console.error('Firebase auth or provider not initialized');
            this.showMessage('Firebase chưa được khởi tạo. Vui lòng tải lại trang.', 'error');
            return;
        }
        
        try {
            // Import signInWithPopup
            const { signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const result = await signInWithPopup(this.firebaseAuth, this.googleProvider);
            this.user = result.user;
            this.isAuthenticated = true;
            console.log('Đăng nhập thành công:', this.user.displayName);
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            this.showMessage('Có lỗi xảy ra khi đăng nhập: ' + error.message, 'error');
        }
    }

    async signOut() {
        try {
            // Import signOut
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(this.firebaseAuth);
            this.user = null;
            this.isAuthenticated = false;
            console.log('Đăng xuất thành công');
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('todoApp').style.display = 'none';
    }

    hasLocalData() {
        // Kiểm tra xem có dữ liệu trong localStorage không
        const todos = localStorage.getItem('todos');
        const projects = localStorage.getItem('projects');
        return (todos && todos !== '[]') || (projects && projects !== '[]');
    }

    loadLocalData() {
        // Load dữ liệu từ localStorage
        this.todos = this.loadTodos();
        this.projects = this.loadProjects();
        this.render();
        this.updateStats();
    }

    showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('todoApp').style.display = 'flex';
        
        // Cập nhật thông tin user
        if (this.user) {
            const avatar = this.user.photoURL || '';
            const name = this.user.displayName || 'User';
            const email = this.user.email || '';
            
            document.getElementById('userAvatar').src = avatar;
            document.getElementById('userMenuAvatar').src = avatar;
            document.getElementById('userName').textContent = name;
            document.getElementById('userEmail').textContent = email;
        }
        
        // Render app nếu chưa được render
        if (!document.querySelector('.multi-project-container').hasChildNodes()) {
            this.render();
            this.updateStats();
        }
    }

    // User Menu Methods
    toggleUserMenu() {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.classList.toggle('show');
        }
    }

    closeUserMenu() {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.classList.remove('show');
        }
    }

    async loadUserData() {
        if (!this.isAuthenticated || !this.user) return;
        
        // Hiển thị dữ liệu local ngay lập tức
        this.render();
        this.updateStats();
        console.log('Đã hiển thị dữ liệu local');
        
        // Đồng bộ với Firebase ở background
        this.syncWithFirebaseInBackground();
    }

    async syncWithFirebaseInBackground() {
        try {
            // Import Firestore functions
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userDocRef = doc(this.firebaseDB, 'users', this.user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const firebaseProjects = userData.projects || [];
                const firebaseTodos = userData.todos || [];
                const firebaseCurrentProjectId = userData.currentProjectId || null;
                
                // So sánh và merge dữ liệu
                const mergedData = this.mergeLocalAndFirebaseData(
                    { projects: this.projects, todos: this.todos, currentProjectId: this.currentProjectId },
                    { projects: firebaseProjects, todos: firebaseTodos, currentProjectId: firebaseCurrentProjectId }
                );
                
                // Cập nhật dữ liệu nếu có thay đổi
                if (this.hasDataChanged(mergedData)) {
                    this.projects = mergedData.projects;
                    this.todos = mergedData.todos;
                    this.currentProjectId = mergedData.currentProjectId;
                    
                    // Lưu dữ liệu đã merge
                    this.saveTodos();
                    this.saveProjects();
                    this.saveCurrentProject();
                    
                    // Render lại với dữ liệu mới
                this.render();
                this.updateStats();
                    
                    console.log('Đã đồng bộ và merge dữ liệu từ Firebase');
                    this.showMessage('Đã đồng bộ dữ liệu từ Firebase', 'success');
            } else {
                    // Lưu dữ liệu local lên Firebase nếu không có thay đổi
                await this.saveUserData();
                    console.log('Đã đồng bộ dữ liệu local lên Firebase');
                }
            } else {
                // User mới - lưu dữ liệu local lên Firebase
                await this.saveUserData();
                console.log('Đã tạo user mới và lưu dữ liệu lên Firebase');
            }
        } catch (error) {
            console.error('Lỗi đồng bộ Firebase:', error);
            this.showMessage('Lỗi đồng bộ dữ liệu với Firebase', 'warning');
        }
    }

    mergeLocalAndFirebaseData(localData, firebaseData) {
        // Merge projects - ưu tiên dữ liệu mới hơn
        const mergedProjects = [...localData.projects];
        firebaseData.projects.forEach(firebaseProject => {
            const localIndex = mergedProjects.findIndex(p => p.id === firebaseProject.id);
            if (localIndex >= 0) {
                // So sánh thời gian cập nhật
                const localUpdated = new Date(localData.projects[localIndex].lastUpdated || localData.projects[localIndex].createdAt);
                const firebaseUpdated = new Date(firebaseProject.lastUpdated || firebaseProject.createdAt);
                
                if (firebaseUpdated > localUpdated) {
                    mergedProjects[localIndex] = firebaseProject;
                }
            } else {
                // Project mới từ Firebase
                mergedProjects.push(firebaseProject);
            }
        });

        // Merge todos - ưu tiên dữ liệu mới hơn
        const mergedTodos = [...localData.todos];
        firebaseData.todos.forEach(firebaseTodo => {
            const localIndex = mergedTodos.findIndex(t => t.id === firebaseTodo.id);
            if (localIndex >= 0) {
                // So sánh thời gian cập nhật
                const localUpdated = new Date(localData.todos[localIndex].lastUpdated || localData.todos[localIndex].createdAt);
                const firebaseUpdated = new Date(firebaseTodo.lastUpdated || firebaseTodo.createdAt);
                
                if (firebaseUpdated > localUpdated) {
                    mergedTodos[localIndex] = firebaseTodo;
                }
            } else {
                // Todo mới từ Firebase
                mergedTodos.push(firebaseTodo);
            }
        });

        // Merge currentProjectId - ưu tiên Firebase nếu có
        const mergedCurrentProjectId = firebaseData.currentProjectId || localData.currentProjectId;

        return {
            projects: mergedProjects,
            todos: mergedTodos,
            currentProjectId: mergedCurrentProjectId
        };
    }

    hasDataChanged(mergedData) {
        // Kiểm tra xem có thay đổi gì không
        const projectsChanged = JSON.stringify(this.projects) !== JSON.stringify(mergedData.projects);
        const todosChanged = JSON.stringify(this.todos) !== JSON.stringify(mergedData.todos);
        const currentProjectChanged = this.currentProjectId !== mergedData.currentProjectId;
        
        return projectsChanged || todosChanged || currentProjectChanged;
    }

    async saveUserData() {
        if (!this.isAuthenticated || !this.user) return;
        
        try {
            // Import Firestore functions
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userDocRef = doc(this.firebaseDB, 'users', this.user.uid);
            
            const userData = {
                projects: this.projects,
                todos: this.todos,
                currentProjectId: this.currentProjectId,
                lastUpdated: new Date().toISOString()
            };
            
            await setDoc(userDocRef, userData);
            console.log('Đã lưu dữ liệu lên Firebase');
        } catch (error) {
            console.error('Lỗi lưu dữ liệu:', error);
            // Hiển thị thông báo cho user nếu cần
            if (error.code === 'unavailable') {
                this.showMessage('Mất kết nối. Dữ liệu sẽ được đồng bộ khi có mạng.', 'warning');
            }
        }
    }

    // Phương thức đồng bộ dữ liệu thủ công
    async syncData() {
        if (!this.isAuthenticated) {
            this.showMessage('Vui lòng đăng nhập để đồng bộ dữ liệu', 'warning');
            return;
        }
        
        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.classList.add('syncing');
            syncBtn.disabled = true;
        }
        
        // Hiển thị loading message trong container
        this.showLoadingMessage('Đang đồng bộ dữ liệu...');
        
        try {
            await this.saveUserData();
            this.hideLoadingMessage();
            this.render();
            this.updateStats();
            this.showMessage('Đã đồng bộ dữ liệu thành công!', 'success');
            // Đóng menu sau khi đồng bộ thành công
            this.closeUserMenu();
        } catch (error) {
            console.error('Lỗi đồng bộ:', error);
            this.hideLoadingMessage();
            this.render();
            this.updateStats();
            this.showMessage('Lỗi đồng bộ dữ liệu', 'error');
        } finally {
            if (syncBtn) {
                syncBtn.classList.remove('syncing');
                syncBtn.disabled = false;
            }
        }
    }

    // Context Menu Methods
    handleContextMenu(e) {
        // Ngăn menu mặc định của browser
        e.preventDefault();
        
        // Kiểm tra xem có click vào todo item không
        const todoItem = e.target.closest('.todo-item');
        if (todoItem) {
            const todoId = todoItem.dataset.id;
            this.showContextMenu(e, todoId);
        } else {
            // Click vào vùng trống - hiện context menu chung
            this.showContextMenu(e, null);
        }
    }

    showContextMenu(e, todoId) {
        // Đóng context menu cũ nếu có
        this.closeContextMenu();
        
        // Tạo context menu
        const contextMenu = document.createElement('div');
        contextMenu.className = 'custom-context-menu';
        contextMenu.id = 'customContextMenu';
        
        // Ngăn event bubbling
        contextMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        if (todoId) {
            // Context menu cho todo item
            const todo = this.todos.find(t => t.id === todoId);
            if (!todo) return;
            
            contextMenu.innerHTML = `
                <div class="context-menu-time-blocks">
                    <button class="context-time-btn" onclick="event.stopPropagation(); todoApp.setTimeBlocks('${todoId}', 2)" title="10 phút">10</button>
                    <button class="context-time-btn" onclick="event.stopPropagation(); todoApp.setTimeBlocks('${todoId}', 4)" title="20 phút">20</button>
                    <button class="context-time-btn" onclick="event.stopPropagation(); todoApp.setTimeBlocks('${todoId}', 6)" title="30 phút">30</button>
                    <button class="context-time-btn" onclick="event.stopPropagation(); todoApp.setTimeBlocks('${todoId}', 12)" title="1 giờ">1h</button>
                    <button class="context-time-btn" onclick="event.stopPropagation(); todoApp.setTimeBlocks('${todoId}', 24)" title="2 giờ">2h</button>
                    <button class="context-skip-btn" onclick="event.stopPropagation(); todoApp.skipTodo('${todoId}')" title="Skip">
                        <i class="fas fa-forward"></i>
                    </button>
                </div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" onclick="todoApp.editTodo('${todoId}')">
                    <i class="fas fa-edit"></i>
                    Chỉnh sửa
                </div>
                <div class="context-menu-item" onclick="todoApp.addSubTodo('${todoId}')">
                    <i class="fas fa-plus"></i>
                    Thêm sub
                </div>
                <div class="context-menu-item" onclick="todoApp.startParentSelection('${todoId}')">
                    <i class="fas fa-level-up-alt"></i>
                    Cha con
                </div>
                <div class="context-menu-item" onclick="todoApp.startPrioritySelection('${todoId}')">
                    <i class="fas fa-exclamation"></i>
                    Ưu tiên
                </div>
                <div class="context-menu-item" onclick="todoApp.duplicateTodo('${todoId}')">
                    <i class="fas fa-copy"></i>
                    Nhân bản
                </div>
                <div class="context-menu-item ${todo.parentId === null ? 'disabled' : ''}" onclick="${todo.parentId === null ? '' : `todoApp.makeRoot('${todoId}')`}">
                    <i class="fas fa-home"></i>
                    Làm root
                </div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" onclick="todoApp.deleteTodo('${todoId}')">
                    <i class="fas fa-trash"></i>
                    Xóa
                </div>
            `;
        } else {
            // Context menu cho vùng trống
            const currentProject = this.getCurrentProject();
            if (currentProject) {
                contextMenu.innerHTML = `
                    <div class="context-menu-item" onclick="todoApp.addTodoToProject('${currentProject.id}')">
                        <i class="fas fa-plus"></i>
                        Thêm công việc
                    </div>
                    <div class="context-menu-item" onclick="todoApp.createProject()">
                        <i class="fas fa-folder-plus"></i>
                        Tạo project
                    </div>
                    <div class="context-menu-divider"></div>
                    <div class="context-menu-item" onclick="todoApp.syncData()">
                        <i class="fas fa-sync-alt"></i>
                        Đồng bộ dữ liệu
                    </div>
                `;
            }
        }
        
        // Đặt vị trí context menu
        const x = e.clientX;
        const y = e.clientY;
        
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        
        // Kiểm tra nếu menu bị tràn ra ngoài màn hình
        document.body.appendChild(contextMenu);
        
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${y - rect.height}px`;
        }
        
        // Hiển thị với animation
        setTimeout(() => {
            contextMenu.classList.add('show');
        }, 10);
        
        // Đóng context menu sau khi thực hiện action
        contextMenu.addEventListener('click', (e) => {
            if (e.target.closest('.context-menu-item')) {
                setTimeout(() => {
                    this.closeContextMenu();
                }, 100);
            }
        });
    }

    closeContextMenu() {
        const contextMenu = document.getElementById('customContextMenu');
        if (contextMenu) {
            contextMenu.classList.remove('show');
            setTimeout(() => {
                if (contextMenu.parentNode) {
                    contextMenu.remove();
                }
            }, 200);
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
                { id: '1', text: 'Học JavaScript', completed: false, createdAt: new Date().toISOString(), parentId: null, level: 0, order: 0, projectId: 'default' },
                { id: '2', text: 'Tập thể dục', completed: true, createdAt: new Date().toISOString(), parentId: null, level: 0, order: 1, projectId: 'default' },
                { id: '3', text: 'Đọc sách', completed: false, createdAt: new Date().toISOString(), parentId: null, level: 0, order: 2, projectId: 'default' },
                { id: '4', text: 'Học React', completed: false, createdAt: new Date().toISOString(), parentId: '1', level: 1, order: 0, projectId: 'default' },
                { id: '5', text: 'Học Node.js', completed: false, createdAt: new Date().toISOString(), parentId: '1', level: 1, order: 1, projectId: 'default' },
                { id: '6', text: 'Chạy bộ', completed: false, createdAt: new Date().toISOString(), parentId: '2', level: 1, order: 0, projectId: 'default' },
                { id: '7', text: 'Học Hooks', completed: false, createdAt: new Date().toISOString(), parentId: '4', level: 2, order: 0, projectId: 'default' }
            ];
            
            window.todoApp.todos = sampleTodos;
            window.todoApp.saveTodos();
            window.todoApp.render();
            window.todoApp.updateStats();
        }
    }, 100);
});
