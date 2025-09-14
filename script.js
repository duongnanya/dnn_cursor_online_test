// Todo List Application
class TodoApp {
    constructor() {
        this.projects = this.loadProjects();
        this.currentProjectId = this.loadCurrentProject();
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.draggedTodo = null;
        this.dropTarget = null;
        this.selectedTodos = new Set();
        this.parentSelectionMode = false;
        this.selectedChildId = null;
        this.collapsedTodos = new Set();
        this.plannerMode = false;
        this.savedCollapsedState = new Set(); // Lưu trạng thái collapse trước khi bật planner mode
        
        // Firebase properties
        this.user = null;
        this.isAuthenticated = false;
        this.firebaseAuth = null;
        this.firebaseDB = null;
        this.googleProvider = null;
        this.isDemoMode = false;
        
        this.init();
    }

    init() {
        this.initFirebase();
        this.bindEvents();
        this.checkAuthState();
    }

    bindEvents() {
        // Auth buttons
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const syncBtn = document.getElementById('syncBtn');
        const userAvatar = document.getElementById('userAvatar');
        const userMenu = document.getElementById('userMenu');
        
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
        });

        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });


        // Planner mode toggle
        const plannerModeCheckbox = document.getElementById('plannerMode');
        plannerModeCheckbox.addEventListener('change', (e) => {
            this.plannerMode = e.target.checked;
            this.togglePlannerMode();
        });

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

        // Close actions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.todo-item')) {
                document.querySelectorAll('.todo-actions.show').forEach(action => {
                    action.classList.remove('show');
                });
                // Also cancel parent selection mode
                if (this.parentSelectionMode) {
                    this.cancelParentSelection();
                }
            }
        });

        // Double-click on multi-project-container to toggle planner mode
        const multiProjectContainer = document.getElementById('multiProjectContainer');
        if (multiProjectContainer) {
            multiProjectContainer.addEventListener('dblclick', (e) => {
                // Only toggle if clicking on the container itself, not on project cards
                if (e.target === multiProjectContainer || e.target.closest('.empty-state')) {
                    this.togglePlannerModeFromDoubleClick();
                }
            });
        }
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
            id: Date.now().toString(),
            text: trimmedText,
            completed: false,
            parentId: null,
            level: 0,
            order: siblings.length,
            projectId: projectId,
            createdAt: new Date().toISOString(),
            timeBlocks: 1 // Default 1 block (5 phút)
        };
        
        this.todos.unshift(newTodo);
        this.saveTodos();
        this.render();
        this.updateStats();
        this.showMessage('Đã thêm công việc mới!', 'success');
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            
            // Lưu thời gian xong khi đánh dấu xong
            if (todo.completed) {
                todo.completedAt = new Date().toISOString();
                // Khi click trực tiếp checkbox, luôn reset về 1 block
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
        }
    }

    setTimeBlocks(id, blocks) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.timeBlocks = blocks;
            todo.completed = true; // Tự động đánh dấu hoàn thành khi set time blocks
            todo.completedAt = new Date().toISOString();
            this.saveTodos();
            this.updateTodoItem(id);
            this.updateStats();
            
            const message = `Đã hoàn thành trong ${blocks} block thời gian!`;
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

    getChildrenCount(parentId) {
        // Đếm tất cả children trực tiếp và gián tiếp
        return this.getAllChildren(parentId).length;
    }

    hasChildren(parentId) {
        // Kiểm tra xem todo có children trực tiếp không
        return this.todos.some(todo => todo.parentId === parentId);
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
                id: Date.now().toString(),
                text: text.trim(),
                completed: false,
                createdAt: new Date().toISOString(),
                parentId: parentId,
                level: parentLevel + 1,
                order: order,
                projectId: parentTodo.projectId,
                timeBlocks: 1 // Default 1 block (5 phút)
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

    // Cancel parent selection mode
    cancelParentSelection() {
        this.parentSelectionMode = false;
        this.selectedChildId = null;
        document.body.classList.remove('parent-selection-mode');
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

    // Check if todo is collapsed
    isCollapsed(todoId) {
        return this.collapsedTodos.has(todoId);
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
        if (!projectName || !projectName.trim()) {
            this.showMessage('Tên project không được để trống!', 'warning');
            return;
        }

        if (projectName.trim().length > 50) {
            this.showMessage('Tên project quá dài (tối đa 50 ký tự)!', 'warning');
            return;
        }

        const project = {
            id: Date.now().toString(),
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
        // Get all todos that belong to this project or are children of todos in this project
        const projectTodos = this.todos.filter(t => t.projectId === projectId);
        const allRelatedTodos = new Set();
        
        // Add project todos
        projectTodos.forEach(todo => allRelatedTodos.add(todo.id));
        
        // Add all children of project todos (regardless of their project)
        projectTodos.forEach(todo => {
            const children = this.getAllChildren(todo.id);
            children.forEach(childId => allRelatedTodos.add(childId));
        });
        
        // Filter the related todos
        const relatedTodos = this.todos.filter(t => allRelatedTodos.has(t.id));
        let filtered = [];
        switch (this.currentFilter) {
            case 'pending':
                filtered = relatedTodos.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = relatedTodos.filter(t => t.completed);
                break;
            default:
                filtered = relatedTodos;
        }
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(todo => 
                todo.text.toLowerCase().includes(this.searchQuery)
            );
            
            // Also include parents of matching children
            const matchingIds = new Set(filtered.map(t => t.id));
            const additionalParents = new Set();
            
            filtered.forEach(todo => {
                let currentParentId = todo.parentId;
                while (currentParentId) {
                    const parent = this.todos.find(t => t.id === currentParentId);
                    if (parent && !matchingIds.has(parent.id)) {
                        additionalParents.add(parent.id);
                        matchingIds.add(parent.id);
                    }
                    currentParentId = parent ? parent.parentId : null;
                }
            });
            
            // Add parents to filtered list
            additionalParents.forEach(parentId => {
                const parent = this.todos.find(t => t.id === parentId);
                if (parent) {
                    // Check if parent matches current filter
                    switch (this.currentFilter) {
                        case 'pending':
                            if (!parent.completed) filtered.push(parent);
                            break;
                        case 'completed':
                            if (parent.completed) filtered.push(parent);
                            break;
                        default:
                            filtered.push(parent);
                    }
                }
            });
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
            localStorage.setItem('projects', JSON.stringify(this.projects));
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
        const pendingCount = allTodos.filter(t => !t.completed).length;
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
        const projectTodos = this.getProjectTodos();
        let filtered = [];
        switch (this.currentFilter) {
            case 'pending':
                filtered = projectTodos.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = projectTodos.filter(t => t.completed);
                break;
            default:
                filtered = projectTodos;
        }
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(todo => 
                todo.text.toLowerCase().includes(this.searchQuery)
            );
            
            // Also include parents of matching children
            const matchingIds = new Set(filtered.map(t => t.id));
            const additionalParents = new Set();
            
            filtered.forEach(todo => {
                let currentParentId = todo.parentId;
                while (currentParentId) {
                    const parent = this.todos.find(t => t.id === currentParentId);
                    if (parent && !matchingIds.has(parent.id)) {
                        additionalParents.add(parent.id);
                        matchingIds.add(parent.id);
                    }
                    currentParentId = parent ? parent.parentId : null;
                }
            });
            
            // Add parents to filtered list
            additionalParents.forEach(parentId => {
                const parent = this.todos.find(t => t.id === parentId);
                if (parent) {
                    // Check if parent matches current filter
                    switch (this.currentFilter) {
                        case 'pending':
                            if (!parent.completed) filtered.push(parent);
                            break;
                        case 'completed':
                            if (parent.completed) filtered.push(parent);
                            break;
                        default:
                            filtered.push(parent);
                    }
                }
            });
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
        
        // Check if any non-archived project has todos
        const hasAnyTodos = this.projects.filter(project => !project.archived).some(project => {
            const projectTodos = this.todos.filter(t => t.projectId === project.id);
            return projectTodos.length > 0;
        });

        if (!hasAnyTodos) {
            multiProjectContainer.innerHTML = '';
            emptyState.classList.add('show');
            return;
        }

        emptyState.classList.remove('show');
        
        // Render todos for each project (excluding archived projects)
        multiProjectContainer.innerHTML = this.projects.filter(project => !project.archived).map(project => {
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
                                <div class="project-management-actions planner-only">
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
                
                return `
                <div class="todo-item ${todo.level > 0 ? `level-${todo.level}` : ''} ${parentSelectionClass}" data-id="${todo.id}" 
                     ${this.parentSelectionMode && canBeParent ? `onclick="todoApp.selectParent('${todo.id}')"` : ''}>
                    <div class="todo-content">
                        <div class="todo-checkbox ${todo.completed ? 'completed' : ''} ${this.isLeafNode(todo.id) ? 'leaf-node' : ''}" 
                             onclick="todoApp.toggleTodo('${todo.id}')"
                             ${this.isLeafNode(todo.id) ? 'onmouseenter="todoApp.showTimeBlocksDropdown(event, \'' + todo.id + '\')" onmouseleave="todoApp.hideTimeBlocksDropdown()"' : ''}>
                            ${todo.completed ? (todo.timeBlocks > 1 ? todo.timeBlocks : '<i class="fas fa-check"></i>') : ''}
                            ${this.isLeafNode(todo.id) && !todo.completed ? '<div class="time-blocks-dropdown" style="display: none;" onmouseenter="todoApp.cancelHideDropdown()" onmouseleave="todoApp.hideTimeBlocksDropdown()"><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 2)">2</span><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 3)">3</span><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 4)">4</span><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 5)">5</span><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 6)">6</span></div>' : ''}
                        </div>
                        <div class="todo-text ${todo.completed ? 'completed' : ''}" 
                             ondblclick="todoApp.editTodo('${todo.id}')">
                            <span class="todo-text-content">${this.highlightSearchTerm(todo.text)}</span>
                            ${this.hasChildren(todo.id) ? `
                                <span class="children-count ${this.isCollapsed(todo.id) ? 'collapsed' : 'expanded'}" 
                                      onclick="todoApp.toggleCollapse('${todo.id}')" 
                                      title="${this.isCollapsed(todo.id) ? 'Nhấn để mở rộng' : 'Nhấn để thu gọn'}">
                                    <i class="fas fa-chevron-${this.isCollapsed(todo.id) ? 'right' : 'down'}"></i>
                                    ${this.getChildrenCount(todo.id)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="todo-actions">
                        <button class="action-btn add-sub-btn" onclick="todoApp.addSubTodo('${todo.id}')" 
                                title="Thêm công việc con">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="action-btn set-parent-btn" onclick="todoApp.startParentSelection('${todo.id}')" 
                                title="Chọn cha">
                            <i class="fas fa-level-up-alt"></i>
                        </button>
                        <button class="action-btn make-root-btn" onclick="todoApp.makeRoot('${todo.id}')" 
                                title="Làm root" ${todo.parentId === null ? 'disabled' : ''}>
                            <i class="fas fa-home"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="todoApp.editTodo('${todo.id}')" 
                                title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="todoApp.deleteTodo('${todo.id}')" 
                                title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
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
                            <div class="project-management-actions planner-only">
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

    togglePlannerMode() {
        const body = document.body;
        
        if (this.plannerMode) {
            // Bật Planner Mode
            body.classList.add('planner-mode-on');
            
            // Lưu trạng thái collapse hiện tại
            this.savedCollapsedState = new Set(this.collapsedTodos);
            
            // Uncollapse tất cả todos để hiển thị hết
            this.collapsedTodos.clear();
            
            // Re-render để áp dụng thay đổi
            this.render();
        } else {
            // Tắt Planner Mode
            body.classList.remove('planner-mode-on');
            
            // Khôi phục trạng thái collapse trước đó
            this.collapsedTodos = new Set(this.savedCollapsedState);
            
            // Hide all visible actions
            document.querySelectorAll('.todo-actions.show').forEach(action => {
                action.classList.remove('show');
            });
            
            // Cancel parent selection mode if active
            if (this.parentSelectionMode) {
                this.cancelParentSelection();
            }
            
            // Re-render để áp dụng thay đổi
            this.render();
        }
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
                <div class="todo-checkbox ${todo.completed ? 'completed' : ''} ${this.isLeafNode(todo.id) ? 'leaf-node' : ''}" 
                     onclick="todoApp.toggleTodo('${todo.id}')"
                     ${this.isLeafNode(todo.id) ? 'onmouseenter="todoApp.showTimeBlocksDropdown(event, \'' + todo.id + '\')" onmouseleave="todoApp.hideTimeBlocksDropdown()"' : ''}>
                    ${todo.completed ? (todo.timeBlocks > 1 ? todo.timeBlocks : '<i class="fas fa-check"></i>') : ''}
                    ${this.isLeafNode(todo.id) && !todo.completed ? '<div class="time-blocks-dropdown" style="display: none;" onmouseenter="todoApp.cancelHideDropdown()" onmouseleave="todoApp.hideTimeBlocksDropdown()"><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 2)">2</span><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 3)">3</span><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 4)">4</span><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 5)">5</span><span onclick="event.stopPropagation(); todoApp.setTimeBlocks(\'' + todo.id + '\', 6)">6</span></div>' : ''}
                </div>
                <div class="todo-text ${todo.completed ? 'completed' : ''}" 
                     ondblclick="todoApp.editTodo('${todo.id}')">
                    <span class="todo-text-content">${this.highlightSearchTerm(todo.text)}</span>
                    ${this.hasChildren(todo.id) ? `
                        <span class="children-count ${this.isCollapsed(todo.id) ? 'collapsed' : 'expanded'}" 
                              onclick="todoApp.toggleCollapse('${todo.id}')" 
                              title="${this.isCollapsed(todo.id) ? 'Nhấn để mở rộng' : 'Nhấn để thu gọn'}">
                            <i class="fas fa-chevron-${this.isCollapsed(todo.id) ? 'right' : 'down'}"></i>
                            ${this.getChildrenCount(todo.id)}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="todo-actions">
                <button class="action-btn add-sub-btn" onclick="todoApp.addSubTodo('${todo.id}')" 
                        title="Thêm công việc con">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="action-btn set-parent-btn" onclick="todoApp.startParentSelection('${todo.id}')" 
                        title="Chọn cha">
                    <i class="fas fa-level-up-alt"></i>
                </button>
                <button class="action-btn make-root-btn" onclick="todoApp.makeRoot('${todo.id}')" 
                        title="Làm root" ${todo.parentId === null ? 'disabled' : ''}>
                    <i class="fas fa-home"></i>
                </button>
                <button class="action-btn edit-btn" onclick="todoApp.editTodo('${todo.id}')" 
                        title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="todoApp.deleteTodo('${todo.id}')" 
                        title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    }

    showTimeBlocksDropdown(event, todoId) {
        // Chỉ hiện dropdown cho leaf nodes chưa hoàn thành
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo || todo.completed || !this.isLeafNode(todoId)) return;
        
        event.stopPropagation();
        
        // Clear any existing hide timeout
        if (this.hideDropdownTimeout) {
            clearTimeout(this.hideDropdownTimeout);
            this.hideDropdownTimeout = null;
        }
        
        const dropdown = event.target.querySelector('.time-blocks-dropdown');
        if (dropdown) {
            dropdown.style.display = 'flex';
        }
    }

    hideTimeBlocksDropdown() {
        // Delay ẩn dropdown để dễ di chuột
        this.hideDropdownTimeout = setTimeout(() => {
            document.querySelectorAll('.time-blocks-dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }, 150); // 150ms delay
    }

    cancelHideDropdown() {
        // Hủy việc ẩn dropdown khi hover vào dropdown
        if (this.hideDropdownTimeout) {
            clearTimeout(this.hideDropdownTimeout);
            this.hideDropdownTimeout = null;
        }
    }

    togglePlannerModeFromDoubleClick() {
        // Toggle planner mode
        this.plannerMode = !this.plannerMode;
        
        // Update checkbox state
        const plannerModeCheckbox = document.getElementById('plannerMode');
        if (plannerModeCheckbox) {
            plannerModeCheckbox.checked = this.plannerMode;
        }
        
        // Apply the toggle
        this.togglePlannerMode();
        
        // Show message
        const message = this.plannerMode ? 'Đã bật Planner Mode!' : 'Đã tắt Planner Mode!';
        this.showMessage(message, 'success');
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
            localStorage.setItem('todos', JSON.stringify(this.todos));
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
                return todo;
            });
            
            // Save migrated todos if there were changes
            if (migratedTodos.some(todo => {
                const original = todos.find(t => t.id === todo.id);
                return !original?.projectId || !original?.timeBlocks;
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
                
                // Kiểm tra demo mode
                if (window.isDemoMode) {
                    console.warn('Running in demo mode - Firebase features disabled');
                    this.showMessage('Chế độ demo: Tính năng Firebase đã tắt. Dữ liệu chỉ lưu local.', 'warning');
                    this.isDemoMode = true;
                } else {
                    console.log('Firebase initialized successfully, setting up auth listeners');
                    this.setupAuthListeners();
                }
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
            this.showLoginScreen();
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
        console.log('isDemoMode:', this.isDemoMode);
        console.log('firebaseAuth:', this.firebaseAuth);
        console.log('googleProvider:', this.googleProvider);
        
        // Kiểm tra demo mode
        if (this.isDemoMode) {
            this.showMessage('Chế độ demo: Không thể đăng nhập Firebase. Dữ liệu chỉ lưu local.', 'warning');
            return;
        }
        
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
        if (!this.isAuthenticated || !this.user || this.isDemoMode) return;
        
        // Hiển thị loading message
        this.showLoadingMessage('Đang tải dữ liệu từ Firebase...');
        
        try {
            // Import Firestore functions
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userDocRef = doc(this.firebaseDB, 'users', this.user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                this.projects = userData.projects || [];
                this.todos = userData.todos || [];
                this.currentProjectId = userData.currentProjectId || null;
                
                // Ẩn loading message và render lại với dữ liệu từ Firebase
                this.hideLoadingMessage();
                this.render();
                this.updateStats();
                console.log('Đã tải dữ liệu từ Firebase');
            } else {
                // Lưu dữ liệu local lên Firebase nếu user mới
                this.showLoadingMessage('Đang đồng bộ dữ liệu lên Firebase...');
                await this.saveUserData();
                this.hideLoadingMessage();
                this.render();
                this.updateStats();
            }
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            this.hideLoadingMessage();
            this.render();
            this.updateStats();
            this.showMessage('Lỗi tải dữ liệu từ Firebase', 'error');
        }
    }

    async saveUserData() {
        if (!this.isAuthenticated || !this.user || this.isDemoMode) return;
        
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