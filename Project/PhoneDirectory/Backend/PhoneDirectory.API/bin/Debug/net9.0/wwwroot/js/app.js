"use strict";

class PhoneDirectoryApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5050/api';
        this.token = localStorage.getItem('authToken');
        this.currentUser = null;
        this.currentPage = 1;
        this.pageSize = 20;
        this.searchTerm = '';
        this.departmentFilter = '';
        this.positionFilter = '';
        
        this.contactTypes = [
            { id: 1, name: 'InternalPhone', description: 'Внутренний телефон' },
            { id: 2, name: 'CityPhone', description: 'Городской телефон' },
            { id: 3, name: 'MobilePhone', description: 'Мобильный телефон' },
            { id: 4, name: 'Email', description: 'Электронная почта' },
            { id: 5, name: 'WorkEmail', description: 'Рабочая почта' }
        ];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkAuth();
    }
    
    bindEvents() {
        // Кнопки входа/выхода
        document.getElementById('login-btn')?.addEventListener('click', () => this.login());
        document.getElementById('show-register-btn')?.addEventListener('click', () => this.showRegisterScreen());
        document.getElementById('show-login-btn')?.addEventListener('click', () => this.showLoginScreen());
        document.getElementById('register-btn')?.addEventListener('click', () => this.register());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        
        // Поиск и фильтры
        document.getElementById('search-btn')?.addEventListener('click', () => this.search());
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.search();
                }
            });
        }
        
        const departmentFilter = document.getElementById('department-filter');
        if (departmentFilter) {
            departmentFilter.addEventListener('change', (e) => {
                this.departmentFilter = e.target.value;
                this.loadSubscribers();
            });
        }
        
        const positionFilter = document.getElementById('position-filter');
        if (positionFilter) {
            positionFilter.addEventListener('change', (e) => {
                this.positionFilter = e.target.value;
                this.loadSubscribers();
            });
        }
        
        // Редактирование профиля
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => this.showEditProfile());
    }
    
    async checkAuth() {
        if (this.token) {
            try {
                await this.loadCurrentUser();
                this.showMainScreen();
                await this.loadSubscribers();
                await this.loadFilters();
            } catch (error) {
                console.error('Auth error:', error);
                localStorage.removeItem('authToken');
                this.token = null;
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }
    }
    
    showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">${this.escapeHtml(message)}</div>
    `;
    
    // Базовые стили для toast
    toast.style.cssText = `
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s, transform 0.3s;
        max-width: 350px;
        word-wrap: break-word;
    `;
    
    container.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Автоматическое скрытие
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, duration);
}

    async loadCurrentUser() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/subscribercards/my`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                throw new Error('Невалидный токен');
            }
            
            if (response.status === 404) {
                // Карточка не найдена, но пользователь аутентифицирован
                const tokenData = this.parseJwt(this.token);
                const roleDisplay = tokenData.role === 'Admin' ? 'Администратор' : 'Абонент';
                
                this.currentUser = { 
                    id: 0, 
                    fullName: 'Неизвестно',
                    role: 'Subscriber' 
                };
                
                const userInfoElement = document.getElementById('user-info');
                if (userInfoElement) {
                    userInfoElement.textContent = `${tokenData.unique_name || tokenData.name || 'Пользователь'} (${roleDisplay}) - Карточка не создана`;
                }
                return;
            }
            
            if (!response.ok) {
                throw new Error('Failed to load user');
            }
            
            const userData = await response.json();
            this.currentUser = userData;
            
            const tokenData = this.parseJwt(this.token);
            const roleDisplay = tokenData.role === 'Admin' ? 'Администратор' : 'Абонент';
            
            const userInfoElement = document.getElementById('user-info');
            if (userInfoElement) {
                userInfoElement.textContent = 
                    `${userData.fullName || tokenData.unique_name || 'Пользователь'} (${roleDisplay})`;
            }
            
        } catch (error) {
            console.error('Failed to load user:', error);
            throw error;
        }
    }
    
    parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing token:', error);
            return { 
                role: 'Subscriber',
                unique_name: 'Пользователь'
            };
        }
    }
    
    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showError('Заполните все поля');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка входа');
            }
            
            this.token = data.token;
            localStorage.setItem('authToken', data.token);
            await this.loadCurrentUser();
            this.showMainScreen();
            await this.loadSubscribers();
            await this.loadFilters();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async register() {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        
        if (!username || !password || !confirmPassword) {
            this.showRegisterError('Заполните все поля');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showRegisterError('Пароли не совпадают');
            return;
        }
        
        if (password.length < 6) {
            this.showRegisterError('Пароль должен быть не менее 6 символов');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username: username, 
                    password: password 
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка регистрации');
            }
            
            this.showRegisterSuccess('Регистрация успешна! Теперь войдите в систему.');
            
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
            document.getElementById('reg-confirm-password').value = '';
            
            setTimeout(() => {
                this.showLoginScreen();
            }, 2000);
            
        } catch (error) {
            this.showRegisterError(error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    showRegisterSuccess(message) {
        const errorElement = document.getElementById('register-error');
        if (errorElement) {
            errorElement.style.color = '#48bb78';
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        this.currentUser = null;
        this.showLoginScreen();
    }
    
    async loadSubscribers() {
        this.showLoading(true);

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                pageSize: this.pageSize
            });

            if (this.searchTerm) {
                params.append('searchTerm', this.searchTerm);
            }

            if (this.departmentFilter) {
                params.append('department', this.departmentFilter);
            }

            if (this.positionFilter) {
                params.append('position', this.positionFilter);
            }

            const response = await fetch(`${this.apiBaseUrl}/directory/search?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }

            const data = await response.json();
            console.log('Полученные данные:', data);
            console.log('totalCount:', data.totalCount);
            console.log('items.length:', data.items?.length);
            this.renderSubscribers(data);
            
        } catch (error) {
            console.error('Error:', error);
            this.showErrorInMain('Не удалось загрузить данные');
        } finally {
            this.showLoading(false);
        }
    }
    
    showErrorInMain(message) {
        const container = document.getElementById('subscribers-list');
        if (container) {
            container.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }
    
    async loadFilters() {
        try {
            const deptResponse = await fetch(`${this.apiBaseUrl}/directory/departments`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (deptResponse.ok) {
                const departments = await deptResponse.json();
                this.renderFilter('department-filter', departments);
            }
            
            const posResponse = await fetch(`${this.apiBaseUrl}/directory/positions`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (posResponse.ok) {
                const positions = await posResponse.json();
                this.renderFilter('position-filter', positions);
            }
            
        } catch (error) {
            console.error('Ошибка загрузки фильтров:', error);
        }
    }
    
    renderFilter(filterId, items) {
        const select = document.getElementById(filterId);
        if (!select) return;
        
        const currentValue = select.value;
        
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        items.forEach(item => {
            if (item) {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                select.appendChild(option);
            }
        });
        
        select.value = currentValue;
    }
    
    renderSubscribers(data) {
        const container = document.getElementById('subscribers-list');
        if (!container) return;

        container.innerHTML = '';

        if (!data.items || data.items.length === 0) {
            container.innerHTML = '<div class="no-data">Абоненты не найдены</div>';
            // Обновляем счетчик сотрудников - показываем 0
            this.updateEmployeeCount(0);
            return;
        }

        data.items.forEach(subscriber => {
            const card = this.createSubscriberCard(subscriber);
            container.appendChild(card);
        });

        // Обновляем счетчик сотрудников с общим количеством
        this.updateEmployeeCount(data.totalCount);

        this.renderPagination(data.totalPages);
    }

    updateEmployeeCount(count) {
        const countElement = document.getElementById('employee-count-value');
        if (countElement) {
            countElement.textContent = count;
        }
    }
    
    createSubscriberCard(subscriber) {
        const card = document.createElement('div');
        card.className = 'subscriber-card';
        card.style.cursor = 'pointer';

        card.dataset.subscriberId = subscriber.id || subscriber.Id;

        card.addEventListener('click', async () => {
            const id = card.dataset.subscriberId;
            if (id) {
                await this.loadAndShowSubscriberDetails(parseInt(id));
            }
        });

        const contacts = [];

        if (subscriber.contactInfos && subscriber.contactInfos.length > 0) {
            subscriber.contactInfos.forEach(contact => {
                if (contact.value && contact.type) {
                    const typeName = this.getContactTypeName(contact.type);
                    contacts.push({
                        type: contact.type,
                        value: `${typeName}: ${contact.value}`,
                        icon: this.getContactIcon(contact.type)
                    });
                }
            });
        } else if (subscriber.ContactInfos && subscriber.ContactInfos.length > 0) {
            subscriber.ContactInfos.forEach(contact => {
                if (contact.Value && contact.Type) {
                    const typeName = this.getContactTypeName(contact.Type);
                    contacts.push({
                        type: contact.Type,
                        value: `${typeName}: ${contact.Value}`,
                        icon: this.getContactIcon(contact.Type)
                    });
                }
            });
        } else {
            if (subscriber.internalPhone) {
                contacts.push({
                    type: 'InternalPhone',
                    value: `Внутренний: ${subscriber.internalPhone}`,
                    icon: 'fa-phone-office'
                });
            }
            
            if (subscriber.mobilePhone) {
                contacts.push({
                    type: 'MobilePhone',
                    value: `Мобильный: ${subscriber.mobilePhone}`,
                    icon: 'fa-mobile-alt'
                });
            }
            
            if (subscriber.cityPhone) {
                contacts.push({
                    type: 'CityPhone',
                    value: `Городской: ${subscriber.cityPhone}`,
                    icon: 'fa-phone'
                });
            }
            
            if (subscriber.email) {
                contacts.push({
                    type: 'Email',
                    value: subscriber.email,
                    icon: 'fa-envelope'
                });
            }
        }
        
        const contactsHtml = contacts.map(contact => `
            <div class="contact-item">
                <i class="fas ${contact.icon}"></i>
                <span>${contact.value}</span>
            </div>
        `).join('');
        
        card.innerHTML = `
            <div class="subscriber-header">
                <div>
                    <div class="subscriber-name">${subscriber.fullName || subscriber.FullName || 'Неизвестно'}</div>
                    ${(subscriber.position || subscriber.Position) ?
                        `<div class="subscriber-position">${subscriber.position || subscriber.Position}</div>` : ''}
                </div>
                ${(subscriber.department || subscriber.Department) ?
                    `<div class="subscriber-department">${subscriber.department || subscriber.Department}</div>` : ''}
            </div>

            ${((subscriber.building || subscriber.Building) || (subscriber.officeNumber || subscriber.OfficeNumber)) ? `
                <div class="subscriber-location">
                    <i class="fas fa-building"></i>
                    ${subscriber.building || subscriber.Building ? `Корпус ${subscriber.building || subscriber.Building}` : ''}
                    ${subscriber.officeNumber || subscriber.OfficeNumber ? `, каб. ${subscriber.officeNumber || subscriber.OfficeNumber}` : ''}
                </div>
            ` : ''}

            ${(subscriber.workExperience || subscriber.WorkExperience) && (subscriber.workExperience || subscriber.WorkExperience) !== "Не указан" ? `
                <div class="subscriber-experience">
                    <i class="fas fa-briefcase"></i>
                    <span>Стаж: ${subscriber.workExperience || subscriber.WorkExperience}</span>
                </div>
            ` : ''}

            ${contacts.length > 0 ? `
                <div class="contact-info">
                    ${contactsHtml}
                </div>
            ` : ''}
        `;
        
        return card;
    }
    
    renderPagination(totalPages) {
        const container = document.getElementById('pagination');
        if (!container || totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHtml = '<div class="pagination">';
        
        paginationHtml += `
            <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="app.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="app.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        paginationHtml += `
            <button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="app.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationHtml += '</div>';
        container.innerHTML = paginationHtml;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.loadSubscribers();
        window.scrollTo(0, 0);
    }
    
    search() {
        this.searchTerm = document.getElementById('search-input').value.trim();
        this.currentPage = 1;
        this.loadSubscribers();
    }
    
    async loadAndShowSubscriberDetails(id) {
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/subscribercards/${id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 403) {
                this.showToast('У вас нет прав для просмотра этой карточки');
                this.showLoading(false);
                return;
            }
            
            if (response.status === 404) {
                this.showToast('Карточка не найдена');
                this.showLoading(false);
                return;
            }
            
            if (!response.ok) {
                throw new Error('Ошибка сервера');
            }
            
            const subscriberDetails = await response.json();
            this.showSubscriberDetailsModal(subscriberDetails);
            
        } catch (error) {
            console.error('Error loading subscriber details:', error);
            this.showToast(`Не удалось загрузить подробную информацию: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    showSubscriberDetailsModal(subscriber) {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.remove();
        });
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const fullName = subscriber.fullName || subscriber.FullName || 'Неизвестно';
        const position = subscriber.position || subscriber.Position || '';
        const department = subscriber.department || subscriber.Department || '';
        const building = subscriber.building || subscriber.Building || '';
        const officeNumber = subscriber.officeNumber || subscriber.OfficeNumber || '';
        const workExperience = subscriber.workExperience || subscriber.WorkExperience || '';
        const contactInfos = subscriber.contactInfos || subscriber.ContactInfos || [];

        const isAdmin = this.isCurrentUserAdmin();
        
        let contactsHtml = '';
        if (contactInfos.length > 0) {
            contactInfos.forEach(contact => {
                const type = contact.type || contact.Type || 'Unknown';
                const value = contact.value || contact.Value || '';
                const isPrimary = contact.isPrimary || contact.IsPrimary || false;
                const typeName = this.getContactTypeName(type);
                const icon = this.getContactIcon(type);
                
                contactsHtml += `
                    <div class="contact-detail" style="
                        display: flex;
                        align-items: center;
                        padding: 12px;
                        background: #f8fafc;
                        border-radius: 6px;
                        margin-bottom: 10px;
                        border-left: 4px solid ${isPrimary ? '#3182ce' : '#667eea'};">
                        <i class="fas ${icon}" style="
                            color: #667eea;
                            margin-right: 12px;
                            width: 24px;
                            text-align: center;
                            font-size: 18px;"></i>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #2d3748;">${typeName}</div>
                            <div style="color: #4a5568; font-size: 15px;">${this.escapeHtml(value)}</div>
                        </div>
                        ${isPrimary ? 
                            '<span style="margin-left: auto; background: #bee3f8; color: #3182ce; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">Основной</span>' 
                            : ''}
                    </div>
                `;
            });
        } else {
            contactsHtml = '<p style="color: #718096; text-align: center; padding: 20px;">Контактная информация отсутствует</p>';
        }
        
        const adminActions = isAdmin ? `
            <div class="admin-actions" style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #e53e3e;">
                <h4 style="color: #e53e3e; margin-bottom: 10px;">
                    <i class="fas fa-user-shield"></i> Действия администратора
                </h4>
                <button id="edit-as-admin-btn" class="btn btn-primary" style="margin-right: 10px;">
                    <i class="fas fa-edit"></i> Редактировать профиль
                </button>
                <button id="delete-subscriber-btn" class="btn btn-danger">
                    <i class="fas fa-trash"></i> Удалить пользователя
                </button>
            </div>
        ` : '';
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #667eea;
                    padding-bottom: 10px;">
                    <div>
                        <h2 style="margin: 0; color: #2d3748;">${this.escapeHtml(fullName)}</h2>
                        ${position ? `<div style="color: #718096; margin-top: 5px;">${this.escapeHtml(position)}</div>` : ''}
                    </div>
                    <button class="modal-close-btn" style="
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #718096;
                        padding: 0;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                        font-weight: bold;">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-row" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong style="color: #4a5568; min-width: 120px; display: inline-block;">Должность:</strong>
                        ${this.escapeHtml(position) || 'Не указана'}
                    </div>
                    <div class="detail-row" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong style="color: #4a5568; min-width: 120px; display: inline-block;">Подразделение:</strong>
                        ${this.escapeHtml(department) || 'Не указано'}
                    </div>
                    <div class="detail-row" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong style="color: #4a5568; min-width: 120px; display: inline-block;">Корпус:</strong>
                        ${this.escapeHtml(building) || 'Не указан'}
                    </div>
                    <div class="detail-row" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong style="color: #4a5568; min-width: 120px; display: inline-block;">Кабинет:</strong>
                        ${this.escapeHtml(officeNumber) || 'Не указан'}
                    </div>
                    ${workExperience && workExperience !== "Не указан" ? `
                    <div class="detail-row" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                        <strong style="color: #4a5568; min-width: 120px; display: inline-block;">Стаж работы:</strong>
                        <span style="color: #667eea; font-weight: 600;">${this.escapeHtml(workExperience)}</span>
                    </div>
                    ` : ''}

                    <h3 style="margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">Контактная информация</h3>
                    <div class="contact-details">
                        ${contactsHtml}
                    </div>

                    ${adminActions}
                </div>
            </div>
        `;
        
        const closeBtn = modal.querySelector('.modal-close-btn');
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            modal.remove();
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.remove();
            }
        });
        
        const handleEscape = (e) => {
            if (e.key === 'Escape' && document.contains(modal)) {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        
        if (isAdmin) {
            const editBtn = modal.querySelector('#edit-as-admin-btn');
            const deleteBtn = modal.querySelector('#delete-subscriber-btn');
            const subscriberId = subscriber.id || subscriber.Id;
            
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    modal.remove();
                    this.editSubscriberAsAdmin(subscriberId);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Вы уверены, что хотите удалить пользователя "${fullName}"? Это действие нельзя отменить.`)) {
                        this.deleteSubscriber(subscriberId);
                        modal.remove();
                    }
                });
            }
        }
        
        document.body.appendChild(modal);
    }
    
    // =============== РЕДАКТИРОВАНИЕ ПРОФИЛЯ (СВОЕГО) ===============
    
    async showEditProfile() {
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/subscribercards/my`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 404) {
                this.showCreateProfileModal();
                return;
            }
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки профиля');
            }
            
            const profile = await response.json();
            await this.loadContactTypes();
            this.showEditProfileModal(profile);
            
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showToast(`Не удалось загрузить профиль: ${error.message}`);
            this.showEmptyProfileModal();
        } finally {
            this.showLoading(false);
        }
    }
    
    showEditProfileModal(profile) {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.remove();
        });
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        let contactsHtml = '';
        if (profile.contactInfos && profile.contactInfos.length > 0) {
            profile.contactInfos.forEach((contact, index) => {
                const formattedContact = {
                    id: contact.id || contact.Id || 0,
                    contactTypeId: contact.contactTypeId || contact.ContactTypeId,
                    type: contact.type || contact.Type,
                    value: contact.value || contact.Value || '',
                    isPrimary: contact.isPrimary || contact.IsPrimary || false
                };
                
                contactsHtml += this.createContactFieldHtml(formattedContact, index);
            });
        } else {
            contactsHtml = this.createContactFieldHtml();
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2d3748;">Редактирование профиля</h2>
                    <button class="close-btn" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #718096;">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="edit-profile-form">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">ФИО:</label>
                            <input type="text" id="edit-profile-fullname" 
                                value="${this.escapeHtml(profile.fullName || profile.FullName || '')}" 
                                class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;" required>
                        </div>
                        
                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Должность:</label>
                                <input type="text" id="edit-profile-position" 
                                    value="${this.escapeHtml(profile.position || profile.Position || '')}" 
                                    class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Подразделение:</label>
                                <input type="text" id="edit-profile-department" 
                                    value="${this.escapeHtml(profile.department || profile.Department || '')}" 
                                    class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                        </div>
                        
                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Корпус:</label>
                                <input type="text" id="edit-profile-building"
                                    value="${this.escapeHtml(profile.building || profile.Building || '')}"
                                    class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Кабинет:</label>
                                <input type="text" id="edit-profile-office"
                                    value="${this.escapeHtml(profile.officeNumber || profile.OfficeNumber || '')}"
                                    class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Дата приема на работу:</label>
                            <input type="date" id="edit-profile-hire-date"
                                value="${profile.hireDate || profile.HireDate ? new Date(profile.hireDate || profile.HireDate).toISOString().split('T')[0] : ''}"
                                class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                        </div>

                        <h3 style="margin-top: 20px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">Контактная информация</h3>
                        <div id="profile-contacts-container">
                            ${contactsHtml}
                        </div>
                        
                        <button type="button" onclick="app.addProfileContact()" 
                                class="btn btn-secondary" style="margin-top: 10px; padding: 10px 15px; background: #48bb78; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-plus"></i> Добавить контакт
                        </button>
                    </form>
                </div>
                <div class="modal-footer" style="
                    margin-top: 25px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 15px;">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()" style="
                        padding: 10px 20px;
                        background: transparent;
                        border: 2px solid #667eea;
                        color: #667eea;
                        border-radius: 5px;
                        cursor: pointer;">
                        Отмена
                    </button>
                    <button class="btn btn-primary" onclick="app.saveProfile()" style="
                        padding: 10px 20px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;">
                        Сохранить
                    </button>
                </div>
            </div>
        `;
        
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    createContactFieldHtml(contact = null, index = 0) {
        const contactId = contact ? (contact.id || contact.Id || 0) : 0;
        const value = contact ? (contact.value || contact.Value || '') : '';
        const isPrimary = contact ? (contact.isPrimary || contact.IsPrimary || false) : false;
        
        let typeId = 1;
        if (contact) {
            if (contact.contactTypeId !== undefined) {
                typeId = contact.contactTypeId;
            } else if (contact.ContactTypeId !== undefined) {
                typeId = contact.ContactTypeId;
            } else if (contact.type || contact.Type) {
                const typeName = (contact.type || contact.Type || '').toLowerCase();
                const typeMap = {
                    'internalphone': 1,
                    'cityphone': 2,
                    'mobilephone': 3,
                    'email': 4,
                    'workemail': 5
                };
                typeId = typeMap[typeName] || 1;
            }
        }
        
        let optionsHtml = '';
        if (this.contactTypes && this.contactTypes.length > 0) {
            optionsHtml = this.contactTypes.map(type => {
                const selected = type.id == typeId ? 'selected' : '';
                const displayName = type.description || type.name;
                return `<option value="${type.id}" ${selected}>${displayName}</option>`;
            }).join('');
        }
        
        return `
            <div class="contact-edit-field" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                <input type="hidden" class="contact-id" value="${contactId}">
                
                <select class="contact-type-select" style="flex: 2; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                    ${optionsHtml}
                </select>
                
                <input type="text" class="contact-value" 
                    value="${this.escapeHtml(value)}" 
                    placeholder="Введите значение" 
                    style="flex: 3; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                
                <label style="display: flex; align-items: center; gap: 5px; flex: 1;">
                    <input type="radio" name="primary-contact" 
                        class="contact-primary" ${isPrimary ? 'checked' : ''}>
                    Основной
                </label>
                
                <button type="button" onclick="app.removeContactField(this)" 
                        class="btn btn-danger" style="padding: 5px 10px; background: #f56565; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    addProfileContact() {
        const container = document.getElementById('profile-contacts-container');
        container.insertAdjacentHTML('beforeend', this.createContactFieldHtml());
    }
    
    removeContactField(button) {
        const field = button.closest('.contact-edit-field');
        if (field) {
            const idInput = field.querySelector('.contact-id');
            if (idInput && parseInt(idInput.value) > 0) {
                const valueInput = field.querySelector('.contact-value');
                valueInput.value = "";
                valueInput.placeholder = "Контакты с пустыми значениями будут удалены";
                valueInput.style.borderColor = '#f56565';
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-trash"></i>';
                button.style.background = '#a0aec0';
            } else {
                field.remove();
            }
        }
    }
    
    validateProfileForm() {
        const fullName = document.getElementById('edit-profile-fullname').value;
        if (!fullName.trim()) {
            this.showToast('Поле "ФИО" обязательно для заполнения');
            return false;
        }
        return true;
    }
    
    collectProfileFormData() {
        const contactFields = document.querySelectorAll('.contact-edit-field');
        const contactInfos = [];
        
        contactFields.forEach(field => {
            const typeSelect = field.querySelector('.contact-type-select');
            const valueInput = field.querySelector('.contact-value');
            const primaryCheckbox = field.querySelector('.contact-primary');
            const idInput = field.querySelector('.contact-id');
            
            const contactId = parseInt(idInput?.value) || 0;
            const contactTypeId = parseInt(typeSelect.value);
            const value = valueInput.value.trim();
            const isPrimary = primaryCheckbox?.checked || false;
            
            if (value) {
                contactInfos.push({
                    Id: contactId,
                    ContactTypeId: contactTypeId,
                    Value: value,
                    IsPrimary: isPrimary
                });
            } else if (contactId > 0) {
                contactInfos.push({
                    Id: contactId,
                    ContactTypeId: contactTypeId,
                    Value: "",
                    IsPrimary: isPrimary
                });
            }
        });
        
        return {
            FullName: document.getElementById('edit-profile-fullname').value,
            Position: document.getElementById('edit-profile-position').value,
            Department: document.getElementById('edit-profile-department').value,
            Building: document.getElementById('edit-profile-building').value,
            OfficeNumber: document.getElementById('edit-profile-office').value,
            HireDate: document.getElementById('edit-profile-hire-date').value || null,
            ContactInfos: contactInfos
        };
    }
    
    async saveProfile() {
        if (!this.validateProfileForm()) {
            return;
        }
        
        this.showLoading(true);
        
        try {
            const formData = this.collectProfileFormData();
            const validContacts = formData.ContactInfos.filter(contact => 
                contact.Value && contact.Value.trim()
            );
            
            if (validContacts.length === 0) {
                this.showToast('Необходимо добавить хотя бы один контакт', 'error');
                this.showLoading(false);
                return;
            }
            
            formData.ContactInfos = validContacts;
            
            const response = await fetch(`${this.apiBaseUrl}/subscribercards/my`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                let errorMessage = 'Ошибка сохранения';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // ignore
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            
            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
            
            await this.loadCurrentUser();
            await this.loadSubscribers();
            
            // Обрабатываем успешный ответ без сообщения
            if (result.message) {
                this.showToast(result.message, 'success');
            } else {
                this.showToast('Профиль успешно обновлен!', 'success');
            }
            
        } catch (error) {
            console.error('Save error:', error);
            this.showToast(`Ошибка сохранения: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    showEmptyProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2d3748;">Редактирование профиля</h2>
                    <button class="close-btn" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #718096;">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="color: #f56565; margin-bottom: 20px; padding: 10px; background: #fed7d7; border-radius: 5px;">
                        <i class="fas fa-exclamation-triangle"></i> Не удалось загрузить данные профиля. Проверьте подключение к серверу.
                    </div>
                    <form id="edit-profile-form">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">ФИО:</label>
                            <input type="text" id="edit-profile-fullname" 
                                class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;" required>
                        </div>
                        
                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Должность:</label>
                                <input type="text" id="edit-profile-position" 
                                    class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Подразделение:</label>
                                <input type="text" id="edit-profile-department" 
                                    class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                        </div>
                        
                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Корпус:</label>
                                <input type="text" id="edit-profile-building" 
                                    class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Кабинет:</label>
                                <input type="text" id="edit-profile-office" 
                                    class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                        </div>
                        
                        <h3 style="margin-top: 20px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">Контактная информация</h3>
                        <div id="profile-contacts-container">
                            ${this.createContactFieldHtml()}
                        </div>
                        
                        <button type="button" onclick="app.addProfileContact()" 
                                class="btn btn-secondary" style="margin-top: 10px; padding: 10px 15px; background: #48bb78; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-plus"></i> Добавить контакт
                        </button>
                    </form>
                </div>
                <div class="modal-footer" style="
                    margin-top: 25px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 15px;">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()" style="
                        padding: 10px 20px;
                        background: transparent;
                        border: 2px solid #667eea;
                        color: #667eea;
                        border-radius: 5px;
                        cursor: pointer;">
                        Отмена
                    </button>
                    <button class="btn btn-primary" onclick="app.saveProfile()" style="
                        padding: 10px 20px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;">
                        Сохранить
                    </button>
                </div>
            </div>
        `;
        
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    showCreateProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2d3748;">Создание профиля</h2>
                    <button class="close-btn" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #718096;">&times;</button>
                </div>
                <div class="modal-body">
                    <p>У вас еще нет профиля. Давайте создадим его!</p>
                    <form id="create-profile-form">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">ФИО:</label>
                            <input type="text" id="create-fullname" 
                                   class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;" required>
                        </div>
                        
                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Должность:</label>
                                <input type="text" id="create-position" 
                                       class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Подразделение:</label>
                                <input type="text" id="create-department" 
                                       class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                        </div>
                        
                        <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Корпус:</label>
                                <input type="text" id="create-building"
                                       class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                            <div class="form-col" style="flex: 1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Кабинет:</label>
                                <input type="text" id="create-office"
                                       class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Дата приема на работу:</label>
                            <input type="date" id="create-hire-date"
                                   class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                        </div>

                        <h3 style="margin-top: 20px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">Контактная информация</h3>
                        <div id="create-contacts-container">
                            ${this.createContactFieldHtml()}
                        </div>
                        
                        <button type="button" onclick="app.addCreateContact()" 
                                class="btn btn-secondary" style="margin-top: 10px; padding: 10px 15px; background: #48bb78; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-plus"></i> Добавить контакт
                        </button>
                    </form>
                </div>
                <div class="modal-footer" style="
                    margin-top: 25px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 15px;">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()" style="
                        padding: 10px 20px;
                        background: transparent;
                        border: 2px solid #667eea;
                        color: #667eea;
                        border-radius: 5px;
                        cursor: pointer;">
                        Отмена
                    </button>
                    <button class="btn btn-primary" onclick="app.createProfile()" style="
                        padding: 10px 20px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;">
                        Создать профиль
                    </button>
                </div>
            </div>
        `;
        
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    addCreateContact() {
        const container = document.getElementById('create-contacts-container');
        container.insertAdjacentHTML('beforeend', this.createContactFieldHtml());
    }
    
    collectCreateProfileFormData() {
        const contactFields = document.querySelectorAll('#create-contacts-container .contact-edit-field');
        const contactInfos = [];
        
        contactFields.forEach(field => {
            const typeSelect = field.querySelector('.contact-type-select');
            const valueInput = field.querySelector('.contact-value');
            const primaryCheckbox = field.querySelector('.contact-primary');
            
            if (valueInput.value.trim()) {
                contactInfos.push({
                    ContactTypeId: parseInt(typeSelect.value),
                    Value: valueInput.value.trim(),
                    IsPrimary: primaryCheckbox?.checked || false
                });
            }
        });
        
        return {
            FullName: document.getElementById('create-fullname').value,
            Position: document.getElementById('create-position').value,
            Department: document.getElementById('create-department').value,
            Building: document.getElementById('create-building').value,
            OfficeNumber: document.getElementById('create-office').value,
            HireDate: document.getElementById('create-hire-date')?.value || null,
            ContactInfos: contactInfos
        };
    }
    
    async createProfile() {
        this.showLoading(true);
        
        try {
            const formData = this.collectCreateProfileFormData();
            
            const response = await fetch(`${this.apiBaseUrl}/subscribercards/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                let errorMessage = 'Ошибка создания профиля';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // ignore
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            
            document.querySelector('.modal-overlay').remove();
            
            await this.loadCurrentUser();
            await this.loadSubscribers();
            
            // Обрабатываем успешный ответ без сообщения
            if (result.message) {
                this.showToast(result.message, 'success');
            } else {
                this.showToast('Профиль успешно создан!', 'success');
            }
            
        } catch (error) {
            console.error('Create profile error:', error);
            this.showToast(`Ошибка создания профиля: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // =============== АДМИНИСТРАТОРСКИЕ ФУНКЦИИ ===============
    
    async editSubscriberAsAdmin(subscriberId) {
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/subscribercards/${subscriberId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Не удалось загрузить данные пользователя');
            }
            
            const subscriberData = await response.json();
            await this.loadContactTypes();
            this.createAdminEditModal(subscriberData);
            
        } catch (error) {
            console.error('Ошибка загрузки данных для редактирования:', error);
            this.showToast(`Ошибка: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    createAdminEditModal(subscriberData) {
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const fullName = subscriberData.fullName || subscriberData.FullName || '';
        const position = subscriberData.position || subscriberData.Position || '';
        const department = subscriberData.department || subscriberData.Department || '';
        const building = subscriberData.building || subscriberData.Building || '';
        const officeNumber = subscriberData.officeNumber || subscriberData.OfficeNumber || '';
        const contactInfos = subscriberData.contactInfos || subscriberData.ContactInfos || [];
        
        let contactsHtml = '';
        if (contactInfos.length > 0) {
            contactInfos.forEach((contact, index) => {
                const id = contact.id || contact.Id || 0;
                const value = contact.value || contact.Value || '';
                const type = contact.type || contact.Type || 'InternalPhone';
                const isPrimary = contact.isPrimary || contact.IsPrimary || false;
                
                contactsHtml += `
                    <div class="contact-field" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                        <input type="hidden" class="contact-id" value="${id}">
                        
                        <select class="contact-type" style="flex: 2; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                            <option value="1" ${type === 'InternalPhone' ? 'selected' : ''}>Внутренний телефон</option>
                            <option value="2" ${type === 'CityPhone' ? 'selected' : ''}>Городской телефон</option>
                            <option value="3" ${type === 'MobilePhone' ? 'selected' : ''}>Мобильный телефон</option>
                            <option value="4" ${type === 'Email' ? 'selected' : ''}>Электронная почта</option>
                            <option value="5" ${type === 'WorkEmail' ? 'selected' : ''}>Рабочая почта</option>
                        </select>
                        
                        <input type="text" class="contact-value" 
                            value="${this.escapeHtml(value)}" 
                            placeholder="Значение" 
                            style="flex: 3; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                        
                        <label style="display: flex; align-items: center; gap: 5px; flex: 1;">
                            <input type="radio" name="admin-primary-contact" 
                                class="contact-primary" ${isPrimary ? 'checked' : ''}>
                            Основной
                        </label>
                        
                        <button type="button" onclick="app.removeAdminContactField(this)" 
                                class="btn btn-danger" style="padding: 5px 10px; background: #f56565; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });
        } else {
            contactsHtml = this.createAdminContactField();
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 700px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #e53e3e;
                    padding-bottom: 10px;">
                    <div>
                        <h2 style="margin: 0; color: #e53e3e;">
                            <i class="fas fa-user-shield"></i> Редактирование пользователя
                        </h2>
                        <div style="color: #718096; margin-top: 5px;">ID: ${subscriberData.id || subscriberData.Id}</div>
                    </div>
                    <button class="modal-close-btn" style="
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #718096;">&times;</button>
                </div>
                
                <form id="admin-edit-form">
                    <input type="hidden" id="admin-edit-id" value="${subscriberData.id || subscriberData.Id}">
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">ФИО:</label>
                        <input type="text" id="admin-edit-fullname" 
                            value="${this.escapeHtml(fullName)}" 
                            class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;" 
                            required>
                    </div>
                    
                    <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div class="form-col" style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Должность:</label>
                            <input type="text" id="admin-edit-position" 
                                value="${this.escapeHtml(position)}" 
                                class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                        </div>
                        <div class="form-col" style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Подразделение:</label>
                            <input type="text" id="admin-edit-department" 
                                value="${this.escapeHtml(department)}" 
                                class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                        </div>
                    </div>
                    
                    <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div class="form-col" style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Корпус:</label>
                            <input type="text" id="admin-edit-building" 
                                value="${this.escapeHtml(building)}" 
                                class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                        </div>
                        <div class="form-col" style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Кабинет:</label>
                            <input type="text" id="admin-edit-office" 
                                value="${this.escapeHtml(officeNumber)}" 
                                class="form-input" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 5px;">
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">
                        <i class="fas fa-phone"></i> Контактная информация
                    </h3>
                    
                    <div id="admin-contact-fields">
                        ${contactsHtml}
                    </div>
                    
                    <button type="button" onclick="app.addAdminContactField()" 
                            class="btn btn-secondary" style="margin-top: 10px; padding: 10px 15px;">
                        <i class="fas fa-plus"></i> Добавить контакт
                    </button>
                    
                    <div class="form-actions" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                            Отмена
                        </button>
                        <button type="button" class="btn btn-primary" onclick="app.saveAdminEdits()">
                            <i class="fas fa-save"></i> Сохранить изменения
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        const closeBtn = modal.querySelector('.modal-close-btn');
        closeBtn.addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    createAdminContactField() {
        return `
            <div class="contact-field" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                <input type="hidden" class="contact-id" value="0">
                
                <select class="contact-type" style="flex: 2; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                    <option value="1">Внутренний телефон</option>
                    <option value="2">Городской телефон</option>
                    <option value="3">Мобильный телефон</option>
                    <option value="4">Электронная почта</option>
                    <option value="5">Рабочая почта</option>
                </select>
                
                <input type="text" class="contact-value" 
                       placeholder="Введите значение" 
                       style="flex: 3; padding: 8px; border: 2px solid #e2e8f0; border-radius: 5px;">
                
                <label style="display: flex; align-items: center; gap: 5px; flex: 1;">
                    <input type="radio" name="admin-primary-contact" class="contact-primary">
                    Основной
                </label>
                
                <button type="button" onclick="app.removeAdminContactField(this)" 
                        class="btn btn-danger" style="padding: 5px 10px; background: #f56565; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    addAdminContactField() {
        const container = document.getElementById('admin-contact-fields');
        if (container) {
            container.insertAdjacentHTML('beforeend', this.createAdminContactField());
        }
    }
    
    removeAdminContactField(button) {
        const field = button.closest('.contact-field');
        if (field) {
            field.remove();
        }
    }
    
    collectAdminFormData() {
        const contactFields = document.querySelectorAll('#admin-contact-fields .contact-field');
        const contactInfos = [];
        
        contactFields.forEach(field => {
            const typeSelect = field.querySelector('.contact-type');
            const valueInput = field.querySelector('.contact-value');
            const primaryCheckbox = field.querySelector('.contact-primary');
            const idInput = field.querySelector('.contact-id');
            
            if (valueInput.value.trim()) {
                contactInfos.push({
                    Id: parseInt(idInput.value) || 0,
                    ContactTypeId: parseInt(typeSelect.value),
                    Value: valueInput.value.trim(),
                    IsPrimary: primaryCheckbox?.checked || false
                });
            }
        });
        
        if (contactInfos.length > 0 && !contactInfos.some(ci => ci.IsPrimary)) {
            contactInfos[0].IsPrimary = true;
        }
        
        return {
            FullName: document.getElementById('admin-edit-fullname').value,
            Position: document.getElementById('admin-edit-position').value,
            Department: document.getElementById('admin-edit-department').value,
            Building: document.getElementById('admin-edit-building').value,
            OfficeNumber: document.getElementById('admin-edit-office').value,
            ContactInfos: contactInfos
        };
    }
    
    async saveAdminEdits() {
        this.showLoading(true);
        
        try {
            const formData = this.collectAdminFormData();
            const subscriberId = document.getElementById('admin-edit-id').value;
            
            const response = await fetch(`${this.apiBaseUrl}/subscribercards/${subscriberId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                let errorMessage = 'Ошибка сохранения';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // ignore
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            
            document.querySelector('.modal-overlay').remove();
            
            await this.loadSubscribers();
            
            // Обрабатываем успешный ответ без сообщения
            if (result.message) {
                this.showToast(result.message, 'success');
            } else {
                this.showToast('Изменения успешно сохранены!', 'success');
            }
            
        } catch (error) {
            console.error('Ошибка сохранения администратором:', error);
            this.showToast(`Ошибка: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async deleteSubscriber(subscriberId) {
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/subscribercards/${subscriberId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                let errorMessage = 'Ошибка удаления';
                // Проверяем, есть ли тело ответа
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {
                        // Если не удалось распарсить JSON, используем стандартное сообщение
                    }
                }
                throw new Error(errorMessage);
            }
            
            // Если статус 204 (No Content), не пытаемся парсить JSON
            if (response.status !== 204) {
                const result = await response.json();
                this.showToast(result?.message || 'Пользователь успешно удален!', 'success');
            } else {
                this.showToast('Пользователь успешно удален!', 'success');
            }
            
            await this.loadSubscribers();
            
        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            this.showToast(`Ошибка: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // =============== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===============
    
    isCurrentUserAdmin() {
        if (!this.token) return false;
        
        try {
            const tokenData = this.parseJwt(this.token);
            const role = tokenData.role || 
                        tokenData.Role || 
                        tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                        'Subscriber';
            
            return role === 'Admin' || role === 'Administrator';
        } catch (error) {
            console.error('Ошибка при проверке роли:', error);
            return false;
        }
    }
    
    getContactTypeName(type) {
        const typeLower = (type || '').toLowerCase();
        
        const typeNames = {
            'internalphone': 'Внутренний телефон',
            'cityphone': 'Городской телефон',
            'mobilephone': 'Мобильный телефон',
            'email': 'Электронная почта',
            'workemail': 'Рабочая почта'
        };
        
        return typeNames[typeLower] || type || 'Неизвестный тип';
    }
    
    getContactIcon(type) {
        const typeLower = (type || '').toLowerCase();
        
        const icons = {
            'internalphone': 'fa-phone-office',
            'cityphone': 'fa-phone',
            'mobilephone': 'fa-mobile-alt',
            'email': 'fa-envelope',
            'workemail': 'fa-envelope'
        };
        
        return icons[typeLower] || 'fa-phone';
    }
    
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    async loadContactTypes() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/contacttypes`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                this.contactTypes = await response.json();
                console.log('Типы контактов загружены:', this.contactTypes);
            }
        } catch (error) {
            console.error('Ошибка загрузки типов контактов:', error);
        }
    }
    
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }
    
    showError(message) {
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }
    
    showRegisterError(message) {
        const errorElement = document.getElementById('register-error');
        if (errorElement) {
            errorElement.style.color = '#f56565';
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }
    
    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('register-screen').style.display = 'none';
        document.getElementById('main-screen').style.display = 'none';
    }
    
    showRegisterScreen() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('register-screen').style.display = 'block';
        document.getElementById('main-screen').style.display = 'none';
    }
    
    showMainScreen() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('register-screen').style.display = 'none';
        document.getElementById('main-screen').style.display = 'block';
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PhoneDirectoryApp();
});

// Тестовые функции для быстрой проверки
window.testAdmin = () => {
    document.getElementById('username').value = 'admin';
    document.getElementById('password').value = 'admin123';
    app.login();
};

window.testUser = () => {
    document.getElementById('username').value = 'user1';
    document.getElementById('password').value = 'user123';
    app.login();
};