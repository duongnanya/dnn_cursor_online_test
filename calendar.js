// Calendar Application
class CalendarApp {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'week'; // 'month' or 'week' - mặc định là week
        this.weekMode = '624'; // 'normal', '85', '624' - mặc định là 624
        this.selectedProjectId = 'all'; // Filter project
        this.selectedStatusFilter = 'pending'; // Filter status: 'pending', 'completed', 'all' - mặc định là pending
        this.todos = this.loadTodos();
        this.projects = this.loadProjects();
        this.init();
    }

    init() {
        // Refresh data from localStorage to ensure latest data
        this.todos = this.loadTodos();
        this.projects = this.loadProjects();
        
        this.populateProjectFilter();
        this.renderCalendar();
        this.updateDisplay();
        
        // Set initial button states
        this.updateButtonStates();
    }

    updateButtonStates() {
        // Update view button states
        document.getElementById('monthViewBtn').classList.toggle('active', this.currentView === 'month');
        document.getElementById('weekViewBtn').classList.toggle('active', this.currentView === 'week');
        
        // Update status filter display
        this.updateStatusFilterDisplay();
        
        // Update week dropdown state
        this.updateWeekDropdownState();
    }

    loadTodos() {
        try {
            const saved = localStorage.getItem('todos');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading todos:', error);
            return [];
        }
    }

    loadProjects() {
        try {
            const saved = localStorage.getItem('projects');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        const calendarHeader = document.getElementById('calendarHeader');
        
        if (this.currentView === 'week') {
            calendarHeader.style.display = 'none'; // Ẩn header cho week view
            this.renderWeekView(calendarGrid);
        } else {
            calendarHeader.style.display = 'grid'; // Hiển thị header cho month view
            this.renderMonthView(calendarGrid);
        }
    }

    renderWeekView(calendarGrid) {
        calendarGrid.className = 'calendar-grid week-view';
        
        // Lấy ngày đầu tuần (Chủ nhật)
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        
        // Tính toán chiều cao tối đa cho mỗi giờ
        const maxHeightsByHour = this.calculateMaxHeightsByHour(startOfWeek);
        
        // Tạo layout 24 giờ
        calendarGrid.innerHTML = `
            <div class="week-24h-container">
                <div class="time-column">
                    <div class="time-header">Giờ</div>
                    ${this.generateTimeSlots(maxHeightsByHour)}
                </div>
                <div class="days-column">
                    ${this.generateDayColumns(startOfWeek)}
                </div>
            </div>
        `;
    }

    generateTimeSlots(maxHeightsByHour = null) {
        let timeSlots = '';
        const { startHour, endHour } = this.getHourRange();
        
        for (let hour = startHour; hour <= endHour; hour++) {
            const timeLabel = hour.toString().padStart(2, '0') + ':00';
            
            // Sử dụng chiều cao tối đa đã tính toán hoặc chiều cao mặc định
            let height = '40px'; // Chiều cao mặc định
            if (maxHeightsByHour && maxHeightsByHour[hour] !== undefined) {
                height = `${maxHeightsByHour[hour]}px`;
            }
            
            timeSlots += `<div class="time-slot" style="min-height: ${height};">${timeLabel}</div>`;
        }
        return timeSlots;
    }

    getHourRange() {
        switch (this.weekMode) {
            case '85':
                return { startHour: 8, endHour: 17 };
            case '624':
                return { startHour: 6, endHour: 23 };
            default: // normal
                return { startHour: 0, endHour: 23 };
        }
    }

    generateDayColumns(startOfWeek) {
        let dayColumns = '';
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        
        // Tính toán chiều cao tối đa cho mỗi giờ
        const maxHeightsByHour = this.calculateMaxHeightsByHour(startOfWeek);
        
        // Xác định số ngày cần hiển thị dựa trên chế độ tuần
        let daysToShow = 7; // Mặc định hiển thị 7 ngày
        let startIndex = 0; // Bắt đầu từ ngày đầu tiên
        
        if (this.weekMode === '85') {
            daysToShow = 5; // Chỉ hiển thị 5 ngày làm việc (T2-T6)
            startIndex = 1; // Bắt đầu từ thứ 2 (index 1)
        }
        
        for (let i = startIndex; i < startIndex + daysToShow; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            
            const dayTodos = this.getTodosForDate(date);
            const hourSlots = this.generateHourSlots(date, dayTodos, maxHeightsByHour);
            
            dayColumns += `
                <div class="day-column">
                    <div class="day-header-24h">
                        ${dayNames[i]} ${date.getDate()}/${date.getMonth() + 1}
                    </div>
                    <div class="day-content-24h mode-${this.weekMode}">
                        ${hourSlots}
                    </div>
                </div>
            `;
        }
        
        return dayColumns;
    }

    calculateMaxHeightsByHour(startOfWeek) {
        const { startHour, endHour } = this.getHourRange();
        const maxHeightsByHour = {};
        
        // Khởi tạo chiều cao tối đa cho mỗi giờ
        for (let hour = startHour; hour <= endHour; hour++) {
            maxHeightsByHour[hour] = 0;
        }
        
        // Xác định số ngày cần tính toán dựa trên chế độ tuần
        let daysToCalculate = 7; // Mặc định tính toán 7 ngày
        let startIndex = 0; // Bắt đầu từ ngày đầu tiên
        
        if (this.weekMode === '85') {
            daysToCalculate = 5; // Chỉ tính toán 5 ngày làm việc (T2-T6)
            startIndex = 1; // Bắt đầu từ thứ 2 (index 1)
        }
        
        // Tính toán số lượng todos tối đa cho mỗi giờ
        for (let i = startIndex; i < startIndex + daysToCalculate; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dayTodos = this.getTodosForDate(date);
            
            for (let hour = startHour; hour <= endHour; hour++) {
                const { todoCount } = this.getTodosForHour(dayTodos, hour, false, 0);
                maxHeightsByHour[hour] = Math.max(maxHeightsByHour[hour], todoCount);
            }
        }
        
        // Chuyển đổi số lượng todos thành chiều cao
        const baseHeight = 40;
        const todoHeight = 20;
        const minHeight = 40;
        
        for (let hour = startHour; hour <= endHour; hour++) {
            const todoCount = maxHeightsByHour[hour];
            maxHeightsByHour[hour] = Math.max(minHeight, baseHeight + (todoCount * todoHeight));
        }
        
        return maxHeightsByHour;
    }

    generateHourSlots(date, dayTodos, maxHeightsByHour = null) {
        let hourSlots = '';
        const now = new Date();
        const currentHour = now.getHours();
        const isToday = date.toDateString() === now.toDateString();
        const { startHour, endHour } = this.getHourRange();
        
        for (let hour = startHour; hour <= endHour; hour++) {
            let hourClass = 'hour-slot';
            
            // Add time-based classes
            if (isToday) {
                if (hour < currentHour) {
                    hourClass += ' past-hour';
                } else if (hour === currentHour) {
                    hourClass += ' current-hour';
                } else {
                    hourClass += ' future-hour';
                }
            } else if (date < now) {
                hourClass += ' past-hour';
            } else {
                hourClass += ' future-hour';
            }
            
            // Add highlight classes based on week mode
            hourClass += this.getHighlightClass(hour);
            
            // Lấy todos cho giờ này
            const { todosHtml, todoCount } = this.getTodosForHour(dayTodos, hour, isToday, currentHour);
            
            // Sử dụng chiều cao tối đa đã tính toán hoặc tính toán động nếu không có
            let dynamicHeight;
            if (maxHeightsByHour && maxHeightsByHour[hour] !== undefined) {
                dynamicHeight = maxHeightsByHour[hour];
            } else {
                // Fallback: tính toán chiều cao động dựa trên số lượng todos
                const baseHeight = 40;
                const todoHeight = 20;
                const minHeight = 40;
                dynamicHeight = Math.max(minHeight, baseHeight + (todoCount * todoHeight));
            }
            
            hourSlots += `
                <div class="${hourClass}" data-hour="${hour}" style="min-height: ${dynamicHeight}px;">
                    ${todosHtml}
                </div>
            `;
        }
        
        return hourSlots;
    }

    getHighlightClass(hour) {
        switch (this.weekMode) {
            case 'normal':
                // Highlight ngoài 8-17h
                if (hour < 8 || hour > 17) {
                    return ' highlight-normal';
                }
                break;
            case '85':
                // Highlight 12-1h (12:00-12:59)
                if (hour === 12) {
                    return ' highlight-85';
                }
                break;
            case '624':
                // Highlight 6-8h, 12-1h và từ 17h trở đi
                if (hour >= 6 && hour <= 7) {
                    return ' highlight-624-morning';
                } else if (hour === 12) {
                    return ' highlight-624-lunch';
                } else if (hour >= 17) {
                    return ' highlight-624-evening';
                }
                break;
        }
        return '';
    }

    getTodosForHour(dayTodos, hour, isToday, currentHour) {
        let todosHtml = '';
        let todoIndex = 0;
        
        // Lọc todos hiển thị trong giờ này
        const todosInHour = dayTodos.filter(todo => {
            // Bỏ qua todo Skipped
            if (todo.skipped === true) {
                return false;
            }
            
            // Filter theo project
            if (this.selectedProjectId !== 'all' && String(todo.projectId) !== String(this.selectedProjectId)) {
                return false;
            }
            
            // Filter theo status
            if (this.selectedStatusFilter !== 'all') {
                if (this.selectedStatusFilter === 'pending' && todo.completed) {
                    return false;
                }
                if (this.selectedStatusFilter === 'completed' && !todo.completed) {
                    return false;
                }
            }
            
            // Chỉ hiển thị 2 level: root (level 1) và todo con (level 2)
            if (todo.level > 2) {
                return false;
            }
            
            let shouldShowInHour = false;
            
            if (todo.completed) {
                // QUY TẮC: Todo đã hoàn thành - hiển thị ở khung giờ được check là hoàn thành
                const completedDate = todo.completedAt ? new Date(todo.completedAt) : new Date(todo.createdAt);
                const completedHour = completedDate.getHours();
                shouldShowInHour = (hour === completedHour);
            } else {
                // QUY TẮC: Todo chưa hoàn thành - hiển thị theo khung giờ created
                const createdDate = new Date(todo.createdAt);
                const createdHour = createdDate.getHours();
                shouldShowInHour = (hour === createdHour);
            }
            
            return shouldShowInHour;
        });
        
        // Sắp xếp todos theo thứ tự ưu tiên (đồng nhất với màn chính)
        todosInHour.sort((a, b) => {
            // 1. Sắp xếp theo level (cha trước con)
            if (a.level !== b.level) {
                return a.level - b.level;
            }
            
            // 2. Sắp xếp theo parentId (cùng level, cùng parent)
            if (a.parentId !== b.parentId) {
                if (!a.parentId && b.parentId) return -1; // a là root, b là con
                if (a.parentId && !b.parentId) return 1;  // a là con, b là root
                return (a.parentId || '').localeCompare(b.parentId || '');
            }
            
            // 3. Sắp xếp theo order (thứ tự trong cùng parent)
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            }
            
            // 4. Fallback: sắp xếp theo thời gian tạo
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
        
        // Render todos đã sắp xếp
        todosInHour.forEach(todo => {
            const topOffset = todoIndex * 20; // Offset để không chồng lên nhau
            todosHtml += `
                <div class="todo-item-24h ${todo.completed ? 'completed' : 'pending'} level-${todo.level}"
                     style="top: ${topOffset}px; height: 18px;"
                     title="${todo.text}">
                    ${this.truncateText(todo.text, 15)}
                </div>
            `;
            todoIndex++;
        });
        
        return { todosHtml, todoCount: todoIndex };
    }

    renderMonthView(calendarGrid) {
        calendarGrid.className = 'calendar-grid';
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Lấy ngày đầu tiên của tháng và số ngày trong tháng
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Lấy ngày cuối tháng trước
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        calendarGrid.innerHTML = '';
        
        // Tạo mảng tất cả các ngày sẽ hiển thị
        const allDays = [];
        
        // Thêm các ngày của tháng trước
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            allDays.push({
                day: day,
                isOtherMonth: true,
                date: new Date(year, month - 1, day)
            });
        }
        
        // Thêm các ngày của tháng hiện tại
        for (let day = 1; day <= daysInMonth; day++) {
            allDays.push({
                day: day,
                isOtherMonth: false,
                date: new Date(year, month, day)
            });
        }
        
        // Thêm các ngày của tháng sau để lấp đầy lưới
        const remainingCells = 42 - allDays.length; // 6 tuần x 7 ngày = 42 ô
        for (let day = 1; day <= remainingCells; day++) {
            allDays.push({
                day: day,
                isOtherMonth: true,
                date: new Date(year, month + 1, day)
            });
        }
        
        // Render theo từng tuần (7 ngày)
        for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
            // Thêm week number cell
            const weekStartDate = allDays[weekIndex * 7].date;
            const weekNumber = this.getWeekNumber(weekStartDate);
            const weekCell = document.createElement('div');
            weekCell.className = 'week-number-cell';
            weekCell.textContent = weekNumber;
            calendarGrid.appendChild(weekCell);
            
            // Thêm 7 ngày của tuần
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const dayData = allDays[weekIndex * 7 + dayIndex];
                if (dayData) {
                    const dayElement = this.createDayElement(dayData.day, dayData.isOtherMonth, dayData.date);
                    calendarGrid.appendChild(dayElement);
                }
            }
        }
    }

    getStartOfWeek(date) {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day; // Lấy Chủ nhật
        startOfWeek.setDate(diff);
        return startOfWeek;
    }

    getWeekNumber(date) {
        // Tính số tuần trong năm theo chuẩn ISO 8601
        const tempDate = new Date(date.getTime());
        tempDate.setHours(0, 0, 0, 0);
        // Đặt ngày về thứ 5 của tuần hiện tại
        tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
        // Lấy ngày 1 tháng 1 của năm
        const week1 = new Date(tempDate.getFullYear(), 0, 4);
        // Tính số tuần
        return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    createDayElement(day, isOtherMonth, date) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        
        // Kiểm tra xem có phải hôm nay không
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Lấy todos cho ngày này
        const dayTodos = this.getTodosForDate(date);
        
        // Tạo HTML cho ngày
        dayElement.innerHTML = `
            <div class="day-number">${day}</div>
            ${dayTodos.length > 0 ? `<div class="todo-count">${dayTodos.length}</div>` : ''}
            <div class="day-todos">
                ${dayTodos.map(todo => `
                    <div class="todo-item-calendar ${todo.completed ? 'completed' : 'pending'} level-${todo.level}" 
                         title="${todo.text}">
                        ${this.truncateText(todo.text, 20)}
                    </div>
                `).join('')}
            </div>
        `;
        
        // Thêm event listener cho click
        dayElement.addEventListener('click', () => {
            this.showDayDetails(date, dayTodos);
        });
        
        return dayElement;
    }

    getTodosForDate(date) {
        // Logic hiển thị todos cho một ngày cụ thể
        const targetDateString = this.getLocalDateString(date);
        const today = new Date();
        const todayString = this.getLocalDateString(today);
        const isToday = targetDateString === todayString;
        const isFuture = date > today;
        
        return this.todos.filter(todo => {
            // Bỏ qua todo Skipped và con của nó
            if (todo.skipped === true) {
                return false;
            }
            
            // Filter theo project
            if (this.selectedProjectId !== 'all' && String(todo.projectId) !== String(this.selectedProjectId)) {
                return false;
            }
            
            // Filter theo status
            if (this.selectedStatusFilter !== 'all') {
                if (this.selectedStatusFilter === 'pending' && todo.completed) {
                    return false;
                }
                if (this.selectedStatusFilter === 'completed' && !todo.completed) {
                    return false;
                }
            }
            
            // Chỉ hiển thị 2 level: root (level 1) và todo con (level 2)
            if (todo.level > 2) {
                return false;
            }
            
            // 1. Todo được tạo trong ngày này - luôn hiển thị
            const todoCreatedDateString = this.getLocalDateString(new Date(todo.createdAt));
            if (todoCreatedDateString === targetDateString) {
                return true;
            }
            
            // 2. Todo đã hoàn thành trong ngày này - hiển thị nếu có completedAt
            if (todo.completed && todo.completedAt) {
                const completedDateString = this.getLocalDateString(new Date(todo.completedAt));
                if (completedDateString === targetDateString) {
                    return true;
                }
            }
            
            // 3. Todo chưa hoàn thành - chỉ hiển thị ở hôm nay và được tạo trước đó
            if (!todo.completed && isToday) {
                const todoCreatedDate = new Date(todo.createdAt);
                // Hiển thị todos được tạo trước hôm nay
                if (todoCreatedDate < today) {
                    return true;
                }
            }
            
            return false;
        });
    }

    getLocalDateString(date) {
        // Tạo date string theo múi giờ địa phương (Việt Nam UTC+7)
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showDayDetails(date, todos) {
        const dateString = date.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let message = `Ngày ${dateString}\n\n`;
        
        if (todos.length === 0) {
            message += 'Không có công việc nào được tạo trong ngày này.';
        } else {
            message += `Có ${todos.length} công việc:\n\n`;
            todos.forEach((todo, index) => {
                const status = todo.completed ? '✅' : '⏳';
                const project = this.projects.find(p => p.id === todo.projectId);
                const projectName = project ? project.name : 'Không xác định';
                message += `${index + 1}. ${status} ${todo.text}\n   📁 ${projectName}\n\n`;
            });
        }
        
        alert(message);
    }

    updateDisplay() {
        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        if (this.currentView === 'week') {
            const startOfWeek = this.getStartOfWeek(this.currentDate);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            const startMonth = startOfWeek.getMonth();
            const endMonth = endOfWeek.getMonth();
            const startYear = startOfWeek.getFullYear();
            const endYear = endOfWeek.getFullYear();
            
            let displayText;
            if (startMonth === endMonth && startYear === endYear) {
                displayText = `${monthNames[startMonth]} ${startYear}`;
            } else if (startYear === endYear) {
                displayText = `${monthNames[startMonth]} - ${monthNames[endMonth]} ${startYear}`;
            } else {
                displayText = `${monthNames[startMonth]} ${startYear} - ${monthNames[endMonth]} ${endYear}`;
            }
            
            document.getElementById('currentMonth').textContent = displayText;
        } else {
            document.getElementById('currentMonth').textContent = 
                `${monthNames[month]} ${year}`;
        }
    }

    setView(view) {
        this.currentView = view;
        
        // Update button states
        document.getElementById('monthViewBtn').classList.toggle('active', view === 'month');
        document.getElementById('weekViewBtn').classList.toggle('active', view === 'week');
        
        // Close dropdown if open
        this.closeWeekDropdown();
        
        // Re-render calendar
        this.renderCalendar();
        this.updateDisplay();
    }

    toggleWeekDropdown() {
        const dropdown = document.querySelector('.week-dropdown');
        const isOpen = dropdown.classList.contains('open');
        
        if (isOpen) {
            this.closeWeekDropdown();
        } else {
            this.openWeekDropdown();
        }
    }

    openWeekDropdown() {
        const dropdown = document.querySelector('.week-dropdown');
        dropdown.classList.add('open');
        
        // Set current view to week if not already
        if (this.currentView !== 'week') {
            this.setView('week');
        }
        
        // Update active state in dropdown
        this.updateWeekDropdownState();
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick.bind(this));
        }, 0);
    }

    closeWeekDropdown() {
        const dropdown = document.querySelector('.week-dropdown');
        dropdown.classList.remove('open');
        document.removeEventListener('click', this.handleOutsideClick.bind(this));
    }

    handleOutsideClick(e) {
        if (!e.target.closest('.week-dropdown')) {
            this.closeWeekDropdown();
        }
    }

    setWeekMode(mode) {
        this.weekMode = mode;
        
        // Update button text
        const modeTexts = {
            'normal': 'Tuần',
            '85': 'Tuần 85',
            '624': 'Tuần 624'
        };
        document.getElementById('weekModeText').textContent = modeTexts[mode];
        
        // Set view to week
        this.currentView = 'week';
        document.getElementById('monthViewBtn').classList.remove('active');
        document.getElementById('weekViewBtn').classList.add('active');
        
        // Update dropdown state and close
        this.updateWeekDropdownState();
        this.closeWeekDropdown();
        
        // Re-render calendar
        this.renderCalendar();
        this.updateDisplay();
    }

    updateWeekDropdownState() {
        const items = document.querySelectorAll('.week-mode-item');
        items.forEach(item => {
            item.classList.remove('active');
        });
        
        const modeMap = {
            'normal': 0,
            '85': 1,
            '624': 2
        };
        
        if (items[modeMap[this.weekMode]]) {
            items[modeMap[this.weekMode]].classList.add('active');
        }
    }

    previousMonth() {
        if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
        } else {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        }
        this.renderCalendar();
        this.updateDisplay();
    }

    nextMonth() {
        if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
        } else {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        }
        this.renderCalendar();
        this.updateDisplay();
    }

    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
        this.updateDisplay();
    }

    populateProjectFilter() {
        const projectFilter = document.getElementById('projectFilter');
        if (!projectFilter) return;
        
        console.log('Projects loaded:', this.projects);
        
        // Clear existing options except "Tất cả dự án"
        projectFilter.innerHTML = '<option value="all">Tất cả dự án</option>';
        
        // Add project options
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectFilter.appendChild(option);
        });
    }

    setProjectFilter(projectId) {
        this.selectedProjectId = projectId;
        console.log('Project filter changed to:', projectId);
        
        // Refresh data from localStorage
        this.todos = this.loadTodos();
        this.projects = this.loadProjects();
        
        console.log('Current todos:', this.todos);
        console.log('Current projects:', this.projects);
        
        this.renderCalendar();
    }

    toggleStatusFilter() {
        // Xoay vòng theo thứ tự: pending → completed → all
        const statusOrder = ['pending', 'completed', 'all'];
        const currentIndex = statusOrder.indexOf(this.selectedStatusFilter);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        
        this.selectedStatusFilter = statusOrder[nextIndex];
        console.log('Status filter changed to:', this.selectedStatusFilter);
        
        // Update button display
        this.updateStatusFilterDisplay();
        
        this.renderCalendar();
    }

    updateStatusFilterDisplay() {
        const statusFilterBtn = document.getElementById('statusFilterBtn');
        const statusFilterColor = document.getElementById('statusFilterColor');
        const statusFilterText = document.getElementById('statusFilterText');
        
        if (!statusFilterBtn || !statusFilterColor || !statusFilterText) return;
        
        switch (this.selectedStatusFilter) {
            case 'pending':
                statusFilterColor.className = 'filter-color pending';
                statusFilterText.textContent = 'Chưa hoàn thành';
                break;
            case 'completed':
                statusFilterColor.className = 'filter-color completed';
                statusFilterText.textContent = 'Đã hoàn thành';
                break;
            case 'all':
                statusFilterColor.className = 'filter-color all';
                statusFilterText.textContent = 'Tất cả';
                break;
        }
    }

    goBack() {
        // Lưu dữ liệu hiện tại trước khi quay lại
        try {
            localStorage.setItem('todos', JSON.stringify(this.todos));
            localStorage.setItem('projects', JSON.stringify(this.projects));
            
            // Đánh dấu có thay đổi trong session để index biết
            const sessionData = {
                lastSyncTime: Date.now(),
                isDataStale: false,
                pendingChanges: true
            };
            sessionStorage.setItem('todoSessionData', JSON.stringify(sessionData));
        } catch (error) {
            console.error('Error saving data before going back:', error);
        }
        
        // Quay lại trang chính
        try {
            // Thử quay lại trang trước đó trước
            if (document.referrer && document.referrer.includes('index.html')) {
                window.history.back();
            } else {
                // Nếu không có referrer, chuyển trực tiếp
                window.location.replace('./index.html');
            }
        } catch (error) {
            // Fallback: chuyển trực tiếp
            window.location.replace('./index.html');
        }
    }
}

// Initialize the calendar app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendarApp = new CalendarApp();
});
