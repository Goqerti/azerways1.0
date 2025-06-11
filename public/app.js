// public/app.js

document.addEventListener('DOMContentLoaded', async () => {
    // Dil tərcüməsini yüklə
    await i18n.loadTranslations(localStorage.getItem('lang') || 'az');
    i18n.translatePage();

    i18n.setupLanguageSwitcher('lang-switcher-main', () => {
        // Dil dəyişdikdən sonra cədvəlləri yenidən render et
        fetchOrdersAndRender();
        fetchAndRenderDebts();
    });

    // --- Global Değişkenler ---
    let currentUserRole = null;
    let currentUserDisplayName = null;
    let currentUserPermissions = {};
    let currentOrders = [];
    let editingOrderId = null;
    let wanderingInterval = null;
    let stealAnimationTimeout = null; 

    // --- DOM Elementleri ---
    const addOrderForm = document.getElementById('addOrderForm');
    const modal = document.getElementById('addOrderModal');
    const showAddOrderFormBtn = document.getElementById('showAddOrderFormBtn');
    const addHotelBtn = document.getElementById('addHotelBtn');
    const hotelEntriesContainer = document.getElementById('hotelEntriesContainer');
    const ordersTableBody = document.getElementById('ordersTableBody');
    const modalTitle = modal?.querySelector('h3');
    const modalSubmitButton = modal?.querySelector('button[type="submit"]');
    const closeButton = modal?.querySelector('.modal-content .close-button');
    const navSatishlarBtn = document.getElementById('navSatishlarBtn');
    const navRezervasiyalarBtn = document.getElementById('navRezervasiyalarBtn');
    const navAxtarishBtn = document.getElementById('navAxtarishBtn');
    const navHesabatBtn = document.getElementById('navHesabatBtn');
    const navBildirishlerBtn = document.getElementById('navBildirishlerBtn');
    const navChatBtn = document.getElementById('navChatBtn');
    const navBorclarBtn = document.getElementById('navBorclarBtn');
    const satishlarView = document.getElementById('satishlarView');
    const rezervasiyalarView = document.getElementById('rezervasiyalarView');
    const bildirishlerView = document.getElementById('bildirishlerView');
    const chatView = document.getElementById('chatView');
    const searchView = document.getElementById('searchView');
    const hesabatView = document.getElementById('hesabatView');
    const borclarView = document.getElementById('borclarView');
    const searchInputRezNomresi = document.getElementById('searchInputRezNomresi');
    const searchButton = document.getElementById('searchButton');
    const searchResultDisplay = document.getElementById('searchResultDisplay');
    const noteModal = document.getElementById('noteModal');
    const closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
    const noteForm = document.getElementById('noteForm');
    const noteSatisNoInput = document.getElementById('noteSatisNo');
    const noteTextInput = document.getElementById('noteText');
    const noteModalTitle = document.getElementById('noteModalTitle');
    const notificationsTableBody = document.getElementById('notificationsTableBody');
    const notificationCountBadge = document.getElementById('notification-count');
    const reservationsTableBody = document.getElementById('reservationsTableBody');
    const reservationFilterHotelNameInput = document.getElementById('reservationFilterHotelName');
    const reservationFilterMonthInput = document.getElementById('reservationFilterMonth');
    const reservationFilterDateInput = document.getElementById('reservationFilterDate');
    const reservationSortOrderSelect = document.getElementById('reservationSortOrder');
    const applyReservationFiltersBtn = document.getElementById('applyReservationFiltersBtn');
    const resetReservationFiltersBtn = document.getElementById('resetReservationFiltersBtn');
    const reportResultDisplay = document.getElementById('reportResultDisplay');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const totalOrdersEl = document.getElementById('totalOrders');
    const totalsByCurrencyContainer = document.getElementById('totalsByCurrencyContainer');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const borclarSearchInput = document.getElementById('borclarSearchInput');
    const borclarSearchBtn = document.getElementById('borclarSearchBtn');
    const borclarTableBody = document.getElementById('borclarTableBody');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsPanelBtn = document.getElementById('closeSettingsPanelBtn');
    const mascotOnBtn = document.getElementById('mascotOnBtn');
    const mascotOffBtn = document.getElementById('mascotOffBtn');
    const mascotContainer = document.getElementById('mascot-container');
    const mascotBubble = document.getElementById('mascot-bubble');

    // --- İstifadəçi Məlumatları və İcazələrin Yüklənməsi ---
    try {
        const [userRes, permsRes] = await Promise.all([
            fetch('/api/user/me'),
            fetch('/api/user/permissions')
        ]);
        if (!userRes.ok || !permsRes.ok) {
            window.location.href = '/login.html';
            return;
        }
        const user = await userRes.json();
        currentUserRole = user.role;
        currentUserDisplayName = user.displayName;
        currentUserPermissions = await permsRes.json();
        const headerTitle = document.getElementById('main-header-title');
        if (headerTitle && currentUserDisplayName) {
            headerTitle.textContent = currentUserDisplayName;
        }
        
        const navUsersBtn = document.getElementById('navUsersBtn');
        if (currentUserRole === 'owner' && navUsersBtn) {
            navUsersBtn.style.display = 'inline-block';
        }

    } catch (error) {
        console.error('Giriş bilgileri veya izinler alınamadı:', error);
        window.location.href = '/login.html';
        return;
    }

    // Forma xanalarına hadisə dinləyiciləri əlavə edirik
    if (addOrderForm) {
        const mascotTips = {
            'turist': 'Bura turist və ya qrup adını daxil edin.',
            'xariciSirket': 'Partnyor şirkətin adını qeyd edə bilərsiniz.',
            'adultGuests': 'Böyük qonaqların sayını daxil edin.',
            'childGuests': 'Uşaq sayını qeyd edin (əgər varsa).',
            'rezNomresi': 'Bu sifariş üçün rezervasiya nömrəsini yazın.',
            'hotel_otelAdi': 'Otel adını bu xanaya daxil edin.',
            'transport_surucuMelumatlari': 'Sürücü və ya transfer məlumatları üçün bu xanadan istifadə edin.',
            'alishAmount': 'Bu xana avtomatik hesablanır, amma maliyyə icazəniz varsa dəyişə bilərsiniz.',
            'satishAmount': 'Müştəriyə təqdim edilən yekun satış qiymətini yazın.'
        };

        addOrderForm.addEventListener('focusin', (event) => {
            const input = event.target;
            const inputId = input.id || (input.classList.contains('hotel_otelAdi') ? 'hotel_otelAdi' : null);
            
            if (inputId && mascotTips[inputId]) {
                updateMascotBubble(mascotTips[inputId]);
            }
        });

        addOrderForm.addEventListener('focusout', () => {
            updateMascotBubble(null);
        });
    }

    // --- TƏNZİMLƏMƏLƏR PANELİ MƏNTİQİ ---
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle('visible');
        });
        closeSettingsPanelBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('visible');
        });
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                settingsPanel.classList.remove('visible');
            }
        });
    }

    function updateMascotButtons(isMascotEnabled) {
        if (!mascotOnBtn || !mascotOffBtn) return;
        if (isMascotEnabled) {
            mascotOnBtn.classList.add('active');
            mascotOffBtn.classList.remove('active');
            if (mascotContainer) mascotContainer.style.display = 'block';
        } else {
            mascotOffBtn.classList.add('active');
            mascotOnBtn.classList.remove('active');
            if (mascotContainer) mascotContainer.style.display = 'none';
        }
    }
    
    if (mascotOnBtn && mascotOffBtn) {
        mascotOnBtn.addEventListener('click', () => {
            localStorage.setItem('mascot_enabled', 'true');
            updateMascotButtons(true);
        });
        mascotOffBtn.addEventListener('click', () => {
            localStorage.setItem('mascot_enabled', 'false');
            updateMascotButtons(false);
        });
    }
    
    let isMascotEnabled = localStorage.getItem('mascot_enabled') !== 'false';
    updateMascotButtons(isMascotEnabled);


    const addHotelEntry = (hotel = {}) => {
        if (!hotelEntriesContainer) return;
        const hotelEntryDiv = document.createElement('div');
        hotelEntryDiv.className = 'hotel-entry';
        hotelEntryDiv.innerHTML = `
            <div class="form-group-inline">
                <input type="text" class="hotel_otelAdi" placeholder="Otel Adı" value="${hotel.otelAdi || ''}">
                <input type="number" step="0.01" class="hotel-price-input" placeholder="Qiymət" value="${hotel.qiymet || 0}">
                <button type="button" class="action-btn-small remove-hotel-btn">-</button>
            </div>
            <div class="form-group-inline">
                <input type="text" class="hotel_otaqKategoriyasi" placeholder="Otaq Kateqoriyası" value="${hotel.otaqKategoriyasi || ''}">
            </div>
            <div class="form-group-inline">
                <div>
                    <label>Giriş Tarixi:</label>
                    <input type="date" class="hotel_girisTarixi" value="${hotel.girisTarixi || ''}">
                </div>
                <div>
                    <label>Çıxış Tarixi:</label>
                    <input type="date" class="hotel_cixisTarixi" value="${hotel.cixisTarixi || ''}">
                </div>
            </div>
            <hr class="dashed">
        `;
        hotelEntriesContainer.appendChild(hotelEntryDiv);
    };
    
    const calculateGelir = (order) => {
        const alishAmount = order.alish?.amount || 0;
        const satishAmount = order.satish?.amount || 0;
        if (order.alish?.currency === order.satish?.currency) {
            return { amount: parseFloat((satishAmount - alishAmount).toFixed(2)), currency: order.satish.currency };
        }
        return { amount: 0, currency: 'N/A', note: 'Fərqli valyutalar' };
    };

    const calculateTotalCost = () => {
        let total = 0;
        document.querySelectorAll('.cost-input, .hotel-price-input').forEach(input => {
            if (!input.disabled) {
                total += parseFloat(input.value) || 0;
            }
        });
        const alishAmountInput = document.getElementById('alishAmount');
        if (alishAmountInput) alishAmountInput.value = total.toFixed(2);
    };

    const resetModalToCreateMode = () => {
        if (addOrderForm) addOrderForm.reset();
        if (hotelEntriesContainer) hotelEntriesContainer.innerHTML = '';
        addHotelEntry();
        calculateTotalCost();
        if (modalTitle) modalTitle.textContent = i18n.t('modalTitleNewOrder');
        if (modalSubmitButton) modalSubmitButton.textContent = i18n.t('addOrderButton');
        editingOrderId = null;
        document.querySelectorAll('#addOrderForm input, #addOrderForm select, #addOrderForm textarea').forEach(el => el.disabled = false);
        document.getElementById('alishAmount').readOnly = true;
    };
    
    const fetchOrdersAndRender = async () => {
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error(i18n.t('errorLoadingOrders'));
            const orders = await response.json();
            currentOrders = orders;
            renderOrdersTable(orders);
        } catch (error) {
            console.error('Sifarişlər yüklənərkən xəta:', error);
            if (ordersTableBody) ordersTableBody.innerHTML = `<tr><td colspan="14" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    };
    
    const renderOrdersTable = (orders) => {
        if (!ordersTableBody) return;
        ordersTableBody.innerHTML = '';
        
        const sortOrder = document.getElementById('sortOrder').value;
        orders.sort((a, b) => {
            const dateA = new Date(a.creationTimestamp);
            const dateB = new Date(b.creationTimestamp);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        const totals = { 
            AZN: { alish: 0, satish: 0, gelir: 0, debt: 0 }, 
            USD: { alish: 0, satish: 0, gelir: 0, debt: 0 }, 
            EUR: { alish: 0, satish: 0, gelir: 0, debt: 0 }
        };

        if (totalOrdersEl) totalOrdersEl.textContent = orders.length;

        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="14" style="text-align:center;">Heç bir sifariş tapılmadı.</td></tr>';
            if (totalsByCurrencyContainer) totalsByCurrencyContainer.innerHTML = '';
            return;
        }

        orders.forEach(order => {
            const row = ordersTableBody.insertRow();
            row.insertCell().textContent = order.satisNo || '-';
            row.insertCell().textContent = new Date(order.creationTimestamp).toLocaleString('az-AZ');
            row.insertCell().textContent = order.rezNomresi || '-';
            row.insertCell().textContent = order.turist || '-';
            row.insertCell().textContent = order.adultGuests || '0';
            row.insertCell().textContent = order.childGuests || '0';
            row.insertCell().textContent = order.xariciSirket || '-';
            row.insertCell().textContent = (order.hotels && order.hotels.length > 0) ? order.hotels[0].otelAdi : '-';
            const alish = order.alish || { amount: 0, currency: 'AZN' };
            const satish = order.satish || { amount: 0, currency: 'AZN' };
            row.insertCell().textContent = `${alish.amount.toFixed(2)} ${alish.currency}`;
            row.insertCell().textContent = `${satish.amount.toFixed(2)} ${satish.currency}`;
            
            const gelir = order.gelir || calculateGelir(order);
            row.insertCell().textContent = `${gelir.amount.toFixed(2)} ${gelir.currency || 'N/A'}`;
            
            let statusText = order.status || '-';
            if (i18n.translations[`status${order.status.replace(/\s+/g, '')}`]) {
                 statusText = i18n.t(`status${order.status.replace(/\s+/g, '')}`);
            }
            row.insertCell().textContent = statusText;
            
            const operationsCell = row.insertCell();
            
            if (currentUserPermissions.canEditOrder) {
                const editButton = document.createElement('button');
                editButton.className = 'action-btn edit';
                editButton.innerHTML = '✏️';
                editButton.title = 'Düzəliş et';
                editButton.onclick = () => handleEditOrder(order.satisNo);
                operationsCell.appendChild(editButton);
            }

            if (currentUserPermissions.canDeleteOrder) {
                const deleteButton = document.createElement('button');
                deleteButton.className = 'action-btn delete';
                deleteButton.innerHTML = '🗑️';
                deleteButton.title = 'Sifarişi sil';
                deleteButton.onclick = () => handleDeleteOrder(order.satisNo);
                operationsCell.appendChild(deleteButton);
            }
            
            const qeydCell = row.insertCell();
            const noteButton = document.createElement('button');
            noteButton.className = 'action-btn note';
            noteButton.innerHTML = '📄';
            noteButton.onclick = () => handleShowNoteModal(order.satisNo);
            qeydCell.appendChild(noteButton);

            ['alish', 'satish', 'gelir'].forEach(type => {
                const data = order[type] || { amount: 0 };
                if (data.currency && totals[data.currency] && typeof data.amount === 'number' && !data.note) {
                    totals[data.currency][type] += data.amount;
                }
            });

            if ((!order.paymentStatus || order.paymentStatus === 'Ödənilməyib') && order.satish?.currency && totals[order.satish.currency]) {
                totals[order.satish.currency].debt += (order.satish.amount || 0);
            }
        });

        if (totalsByCurrencyContainer) {
            totalsByCurrencyContainer.innerHTML = '';
            let hasAnyTotal = Object.values(totals).some(c => c.alish !== 0 || c.satish !== 0 || c.gelir !== 0 || c.debt !== 0);
            if (hasAnyTotal) {
                Object.keys(totals).forEach(currency => {
                    if (totals[currency].alish !== 0 || totals[currency].satish !== 0 || totals[currency].gelir !== 0 || totals[currency].debt !== 0) {
                        const currencyCard = document.createElement('div');
                        currencyCard.className = 'currency-card';
                        currencyCard.innerHTML = `
                            <h4>Yekun (${currency})</h4>
                            <p><span>Alış:</span> <strong>${totals[currency].alish.toFixed(2)}</strong></p>
                            <p><span>Satış:</span> <strong>${totals[currency].satish.toFixed(2)}</strong></p>
                            <p><span>Gəlir:</span> <strong class="${totals[currency].gelir < 0 ? 'text-danger' : 'text-success'}">${totals[currency].gelir.toFixed(2)}</strong></p>
                            <p><span>Borclar:</span> <strong class="text-danger">${totals[currency].debt.toFixed(2)}</strong></p>
                        `; 
                        totalsByCurrencyContainer.appendChild(currencyCard);
                    }
                });
            }
        }
    };

    function handleEditOrder(satisNo) {
        const orderToEdit = currentOrders.find(order => String(order.satisNo) === String(satisNo));
        if (!orderToEdit) return;
        resetModalToCreateMode();
        editingOrderId = satisNo;
        const setInputValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        setInputValue('turist', orderToEdit.turist);
        setInputValue('xariciSirket', orderToEdit.xariciSirket);
        setInputValue('adultGuests', orderToEdit.adultGuests);
        setInputValue('childGuests', orderToEdit.childGuests);
        setInputValue('vizaSayi', orderToEdit.vizaSayi || 0);
        setInputValue('rezNomresi', orderToEdit.rezNomresi);
        setInputValue('transport_surucuMelumatlari', orderToEdit.transport?.surucuMelumatlari);
        setInputValue('transport_odenisKartMelumatlari', orderToEdit.transport?.odenisKartMelumatlari);
        setInputValue('transport_turTevsiri', orderToEdit.transport?.turTevsiri);
        setInputValue('transport_elaveXidmetler', orderToEdit.transport?.elaveXidmetler);
        setInputValue('status', orderToEdit.status);
        setInputValue('qeyd', orderToEdit.qeyd);
        setInputValue('satishAmount', orderToEdit.satish?.amount);
        setInputValue('satishCurrency', orderToEdit.satish?.currency);

        setInputValue('paymentStatus', orderToEdit.paymentStatus || 'Ödənilməyib');
        setInputValue('paymentDueDate', orderToEdit.paymentDueDate || '');
        
        const costs = orderToEdit.detailedCosts || {};
        document.querySelectorAll('.cost-input').forEach(input => {
            const key = input.id.replace('detailedCost_', '') + 'Xerci';
            input.value = costs[key] || 0;
        });

        if (hotelEntriesContainer) hotelEntriesContainer.innerHTML = ''; 
        if (orderToEdit.hotels && orderToEdit.hotels.length > 0) {
            orderToEdit.hotels.forEach(hotel => addHotelEntry(hotel));
        } else {
            addHotelEntry();
        }
        
        calculateTotalCost();
        
        const isFinancialEditForbidden = !currentUserPermissions.canEditFinancials;
        document.querySelectorAll('.cost-input, .hotel-price-input, #satishAmount, #satishCurrency, #alishCurrency')
            .forEach(field => {
                field.disabled = isFinancialEditForbidden;
            });
        
        if (modalTitle) modalTitle.textContent = i18n.t('modalTitleEditOrder', { satisNo: satisNo });
        if (modalSubmitButton) modalSubmitButton.textContent = i18n.t('saveOrderButton');
        modal.style.display = 'block';

        stopMascotLifeCycle();
        moveMascotToElement(document.getElementById('turist'), 'Düzəlişlərə başlayaq!');
    }

    if (addOrderForm) {
        addOrderForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const getFormValue = (id) => document.getElementById(id).value;
            const orderData = {
                turist: getFormValue('turist'),
                xariciSirket: getFormValue('xariciSirket'),
                adultGuests: getFormValue('adultGuests'),
                childGuests: getFormValue('childGuests'),
                vizaSayi: getFormValue('vizaSayi'),
                rezNomresi: getFormValue('rezNomresi'),
                status: getFormValue('status'),
                qeyd: getFormValue('qeyd'),
                transport: {
                    surucuMelumatlari: getFormValue('transport_surucuMelumatlari'),
                    odenisKartMelumatlari: getFormValue('transport_odenisKartMelumatlari'),
                    turTevsiri: getFormValue('transport_turTevsiri'),
                    elaveXidmetler: getFormValue('transport_elaveXidmetler'),
                },
                hotels: [],
                paymentStatus: getFormValue('paymentStatus'),
                paymentDueDate: getFormValue('paymentDueDate')
            };
            if (!editingOrderId || currentUserPermissions.canEditFinancials) {
                 orderData.alish = { amount: parseFloat(getFormValue('alishAmount')) || 0, currency: getFormValue('alishCurrency') };
                 orderData.satish = { amount: parseFloat(getFormValue('satishAmount')) || 0, currency: getFormValue('satishCurrency') };
                 orderData.detailedCosts = {
                    paketXerci: parseFloat(document.getElementById('detailedCost_paket').value) || 0,
                    beledciXerci: parseFloat(document.getElementById('detailedCost_beledci').value) || 0,
                    muzeyXerci: parseFloat(document.getElementById('detailedCost_muzey').value) || 0,
                    vizaXerci: parseFloat(document.getElementById('detailedCost_viza').value) || 0,
                    digerXercler: parseFloat(document.getElementById('detailedCost_diger').value) || 0,
                };
            }
            const hotelEntries = hotelEntriesContainer.querySelectorAll('.hotel-entry');
            hotelEntries.forEach(entry => {
                const hotel = {
                    otelAdi: entry.querySelector('.hotel_otelAdi').value.trim(),
                    otaqKategoriyasi: entry.querySelector('.hotel_otaqKategoriyasi').value.trim(),
                    girisTarixi: entry.querySelector('.hotel_girisTarixi').value,
                    cixisTarixi: entry.querySelector('.hotel_cixisTarixi').value,
                    qiymet: parseFloat(entry.querySelector('.hotel-price-input').value) || 0
                };
                if (hotel.girisTarixi) {
                    orderData.hotels.push(hotel);
                }
            });
            const url = editingOrderId ? `/api/orders/${editingOrderId}` : '/api/orders';
            const method = editingOrderId ? 'PUT' : 'POST';
            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Server xətası baş verdi.');
                }
                
                const newOrderResponse = await response.json();
                
                fetchOrdersAndRender();
                fetchAndRenderNotifications(); 
                modal.style.display = 'none';
                resetMascotPosition();

                if (newOrderResponse.milestone) {
                    triggerMilestoneCelebration(newOrderResponse.milestone.count);
                }

            } catch (error) {
                alert(i18n.t('errorOrderSave', { error: error.message }));
            }
        });
    }

    const handleDeleteOrder = async (satisNo) => {
        if (!confirm(i18n.t('confirmDeleteOrder', { satisNo: satisNo }))) return;
        try {
            const response = await fetch(`/api/orders/${satisNo}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Server xətası: ${response.status}`);
            fetchOrdersAndRender();
        } catch (error) {
            alert(i18n.t('errorOrderDelete'));
        }
    };
    
    function handleShowNoteModal(satisNo) {
        const order = currentOrders.find(o => String(o.satisNo) === String(satisNo));
        if (!order) return;
        noteSatisNoInput.value = order.satisNo;
        noteTextInput.value = order.qeyd || '';
        noteModalTitle.textContent = `Sifariş № ${order.satisNo} üçün Qeyd`;
        noteModal.style.display = 'block';
    }

    if (noteForm) {
        noteForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const satisNo = noteSatisNoInput.value;
            const qeyd = noteTextInput.value;
            try {
                const response = await fetch(`/api/orders/${satisNo}/note`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qeyd })
                });
                if (!response.ok) {
                    const errorResult = await response.json();
                    throw new Error(errorResult.message);
                }
                noteModal.style.display = 'none';
                fetchOrdersAndRender();
            } catch (error) {
                alert(`Qeyd saxlanılarkən xəta: ${error.message}`);
            }
        });
    }

    const fetchReservationsAndRender = async () => {
        if (!reservationsTableBody) return;
        let queryParams = `sortOrder=${reservationSortOrderSelect.value}`;
        if (reservationFilterDateInput.value) queryParams += `&filterDate=${reservationFilterDateInput.value}`;
        else if (reservationFilterMonthInput.value) queryParams += `&filterMonth=${reservationFilterMonthInput.value}`;
        if (reservationFilterHotelNameInput.value.trim()) queryParams += `&hotelName=${encodeURIComponent(reservationFilterHotelNameInput.value.trim())}`;
        
        try {
            const response = await fetch(`/api/reservations?${queryParams}`);
            if (!response.ok) {
                 if (response.status === 401) { alert('Sessiyanız bitib.'); window.location.href = '/login.html'; return; }
                 throw new Error(`Server xətası: ${response.status}`);
            }
            const reservations = await response.json();
            renderReservationsTable(reservations);
        } catch (error) {
            console.error('Rezervasiyalar yüklənərkən xəta:', error);
            reservationsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Rezervasiyaları yükləmək mümkün olmadı.</td></tr>`;
        }
    };

    const renderReservationsTable = (reservations) => {
        if (!reservationsTableBody) return;
        reservationsTableBody.innerHTML = '';
        if (reservations.length === 0) {
            reservationsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Heç bir aktiv otel rezervasiyası tapılmadı.</td></tr>';
            return;
        }
        reservations.forEach(res => {
            const row = reservationsTableBody.insertRow();
            row.insertCell().textContent = res.satisNo || '-';
            row.insertCell().textContent = res.turist || '-';
            row.insertCell().textContent = res.otelAdi || '-';
            row.insertCell().textContent = res.girisTarixi || '-';
            row.insertCell().textContent = res.cixisTarixi || '-';
            row.insertCell().textContent = res.adultGuests ?? '-';
            row.insertCell().textContent = res.childGuests ?? '-';
        });
    };

    const generateInvoicePdf = (order) => {
        if (!order) { alert("PDF yaratmaq üçün sifariş məlumatları tapılmadı."); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFont("helvetica", "normal");
        let yPosition = 20; const leftMargin = 15;
        const title = `${order.satisNo || '00000'}-Th Invoice to ${order.turist || 'XXX'}`;
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text(title, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
        yPosition += 20; doc.setFont("helvetica", "normal");
        
        const tableHead = [['Name', 'Number of pax', 'Description', 'Hotels and rooms', 'Entrances', 'Visas', 'Extras']];
        const pax = (parseInt(order.adultGuests) || 0) + (parseInt(order.childGuests) || 0);
        let hotelInfo = order.hotels && order.hotels.length > 0 ? order.hotels.map(h => `${h.otelAdi || ''}${h.otaqKategoriyasi ? ' ('+h.otaqKategoriyasi+')' : ''}`).join('\n') : '-';
        const description = order.transport?.turTevsiri || '-';
        const extras = order.transport?.elaveXidmetler || '-';
        const vizaInfo = (order.vizaSayi && parseInt(order.vizaSayi) > 0) ? `${order.vizaSayi}` : '-';

        const tableBody = [[order.turist || '-', pax, description, hotelInfo, '-', vizaInfo, extras]];

        for (let i = 0; i < 5; i++) tableBody.push(['', '', '', '', '', '', '']);
        doc.autoTable({
            head: tableHead, body: tableBody, startY: yPosition, theme: 'grid',
            styles: { font: "helvetica", fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'center' } }
        });
        yPosition = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        const totalText = `Total: ${order.satish.amount.toFixed(2)} ${order.satish.currency} + Bank Charges`;
        doc.text(totalText, leftMargin, yPosition);
        yPosition += 10; doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text('Beneficiary Bank // Bank Respublika OJSC ( Baku / Azerbaijan )', leftMargin, yPosition); yPosition += 5;
        doc.text('SWIFT: BRESAZ22', leftMargin, yPosition); yPosition += 5;
        doc.text('Beneficiary: AZER VVAYS TRAVEL MMC', leftMargin, yPosition); yPosition += 5;
        doc.text('IBAN:   AZ15BRES40160US0062166194003', leftMargin, yPosition); yPosition += 5;
        doc.text('GNI Account: 6-2166194-3', leftMargin, yPosition);
        doc.save(`Invoice_${order.rezNomresi || order.satisNo}.pdf`);
    };
    
    const handleSearchOrder = async () => {
        if (!searchInputRezNomresi || !searchResultDisplay) return;
        const rezNomresi = searchInputRezNomresi.value.trim();
        if (!rezNomresi) {
            searchResultDisplay.innerHTML = '<p class="error-message">Axtarış üçün rezervasiya nömrəsini daxil edin.</p>';
            return;
        }
        searchResultDisplay.innerHTML = '<p>Axtarılır...</p>';
        try {
            const response = await fetch(`/api/orders/search/rez/${encodeURIComponent(rezNomresi)}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Server xətası (${response.status})` }));
                throw new Error(errorData.message || 'Sifariş tapılmadı.');
            }
            const order = await response.json();
            if (order) {
                generateInvoicePdf(order);
                searchResultDisplay.innerHTML = `<p class="success-message">"${order.turist}" üçün invoys PDF faylı yaradıldı və endirilir...</p>`;
            }
        } catch (error) {
            searchResultDisplay.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    };
    
    const generateAndDisplayReport = async () => {
        if (!reportResultDisplay) return;
        let queryParams = '';
        const params = [];
        if (document.getElementById('reportFilterYear').value) params.push(`year=${document.getElementById('reportFilterYear').value}`);
        if (document.getElementById('reportFilterMonth').value) params.push(`month=${document.getElementById('reportFilterMonth').value}`);
        if (document.getElementById('reportFilterHotelName').value.trim()) params.push(`hotelName=${encodeURIComponent(document.getElementById('reportFilterHotelName').value.trim())}`);
        queryParams = params.join('&');
        reportResultDisplay.innerHTML = '<p>Hesabat hazırlanır...</p>';
        try {
            const response = await fetch(`/api/reports?${queryParams}`, { headers: { 'Accept': 'application/json' }});
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: `Server xətası (${response.status})` }));
                 throw new Error(errorData.message);
            }
            const reportData = await response.json();
            renderReport(reportData);
        } catch (error) {
            console.error('Hesabat alarkən xəta:', error);
            reportResultDisplay.innerHTML = `<p class="error-message">Hesabatı almaq mümkün olmadı: ${error.message}</p>`;
        }
    };

    const renderReport = (data) => {
        if (!reportResultDisplay) return;
        reportResultDisplay.innerHTML = ''; 
        let html = '<h4>Ümumi Hesabat</h4><div class="report-summary">';
        ['AZN', 'USD', 'EUR'].forEach(currency => {
            if (data.totalAlish[currency] !== 0 || data.totalSatish[currency] !== 0 || data.totalGelir[currency] !== 0) {
                html += `<div class="currency-total report-currency-block"><p><strong>Valyuta: ${currency}</strong></p><p><span>Cəmi Alış:</span> <strong>${data.totalAlish[currency].toFixed(2)}</strong></p><p><span>Cəmi Satış:</span> <strong>${data.totalSatish[currency].toFixed(2)}</strong></p><p><span>Cəmi Gəlir:</span> <strong class="${data.totalGelir[currency] < 0 ? 'text-danger' : 'text-success'}">${data.totalGelir[currency].toFixed(2)}</strong></p></div>`;
            }
        });
        html += '</div><h4>Otellər üzrə Detallı Hesabat</h4>';
        if (Object.keys(data.byHotel).length === 0) {
            html += '<p>Seçilmiş filterlərə uyğun otel məlumatı tapılmadı.</p>';
        } else {
            html += '<div class="table-container"><table class="report-table"><thead><tr><th>Otel Adı</th><th>Sifariş Sayı</th><th>Alış (AZN)</th><th>Satış (AZN)</th><th>Gəlir (AZN)</th><th>Alış (USD)</th><th>Satış (USD)</th><th>Gəlir (USD)</th><th>Alış (EUR)</th><th>Satış (EUR)</th><th>Gəlir (EUR)</th></tr></thead><tbody>';
            for (const hotelName in data.byHotel) {
                const d = data.byHotel[hotelName];
                html += `<tr><td>${hotelName}</td><td>${d.ordersCount}</td><td>${d.alish.AZN.toFixed(2)}</td><td>${d.satish.AZN.toFixed(2)}</td><td class="${d.gelir.AZN < 0 ? 'text-danger' : ''}">${d.gelir.AZN.toFixed(2)}</td><td>${d.alish.USD.toFixed(2)}</td><td>${d.satish.USD.toFixed(2)}</td><td class="${d.gelir.USD < 0 ? 'text-danger' : ''}">${d.gelir.USD.toFixed(2)}</td><td>${d.alish.EUR.toFixed(2)}</td><td>${d.satish.EUR.toFixed(2)}</td><td class="${d.gelir.EUR < 0 ? 'text-danger' : ''}">${d.gelir.EUR.toFixed(2)}</td></tr>`;
            }
            html += '</tbody></table></div>';
        }
        reportResultDisplay.innerHTML = html;
    };
    
    const fetchAndRenderNotifications = async () => {
        const mascotContainer = document.getElementById('mascot-container');
        const mascotBubble = mascotContainer ? mascotContainer.querySelector('.mascot-bubble') : null;

        if (!notificationsTableBody) return;
        
        try {
            const response = await fetch('/api/notifications');
            if (!response.ok) throw new Error('Bildirişləri yükləmək mümkün olmadı.');
            const notifications = await response.json();
            
            if (notificationCountBadge) {
                if (notifications.length > 0) {
                    notificationCountBadge.textContent = notifications.length;
                    notificationCountBadge.style.display = 'inline';
                    if (mascotContainer) {
                        mascotContainer.classList.add('mascot-alert');
                        if(mascotBubble) mascotBubble.textContent = "Təcili bildiriş var!";
                    }
                } else {
                    notificationCountBadge.style.display = 'none';
                    if (mascotContainer) {
                        mascotContainer.classList.remove('mascot-alert');
                        if(mascotBubble) mascotBubble.textContent = "Hər şey qaydasındadır!";
                    }
                }
            }
            renderNotificationsTable(notifications);
        } catch (error) {
            notificationsTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${error.message}</td></tr>`;
            if (mascotContainer) {
                mascotContainer.classList.remove('mascot-alert');
            }
        }
    };
    
    const renderNotificationsTable = (notifications) => {
        if (!notificationsTableBody) return;
        notificationsTableBody.innerHTML = '';
        if (notifications.length === 0) {
            notificationsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Təcili bildiriş yoxdur.</td></tr>';
            return;
        }
        notifications.forEach(notif => {
            const row = notificationsTableBody.insertRow();
            row.insertCell().textContent = notif.satisNo;
            row.insertCell().textContent = notif.turist;
            row.insertCell().textContent = notif.girisTarixi;
            row.insertCell().textContent = notif.problem;
            const actionCell = row.insertCell();
            const goToOrderBtn = document.createElement('button');
            goToOrderBtn.textContent = 'Sifarişə Keç';
            goToOrderBtn.className = 'action-btn edit';
            goToOrderBtn.onclick = () => {
                nav.showView('satishlar');
                handleEditOrder(notif.satisNo);
            };
            actionCell.appendChild(goToOrderBtn);
        });
    };

    const renderDebtsTable = (debts) => {
        if (!borclarTableBody) return;
        borclarTableBody.innerHTML = '';
        if (debts.length === 0) {
            borclarTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${i18n.t('noDebtsFound')}</td></tr>`;
            return;
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        debts.sort((a, b) => (new Date(a.paymentDueDate) || 0) - (new Date(b.paymentDueDate) || 0));

        debts.forEach(debt => {
            const row = borclarTableBody.insertRow();
            const dueDate = debt.paymentDueDate ? new Date(debt.paymentDueDate) : null;
            
            if (dueDate && dueDate < now) {
                row.style.backgroundColor = '#f8d7da';
            }

            row.insertCell().textContent = debt.xariciSirket;
            row.insertCell().textContent = debt.satisNo;
            row.insertCell().textContent = debt.turist;
            row.insertCell().textContent = `${(debt.satish?.amount || 0).toFixed(2)} ${debt.satish?.currency}`;
            row.insertCell().textContent = debt.paymentDueDate || 'Təyin edilməyib';
            
            const actionCell = row.insertCell();
            const goToOrderBtn = document.createElement('button');
            goToOrderBtn.textContent = i18n.t('debtsHeaderGoToOrder');
            goToOrderBtn.className = 'action-btn edit';
            goToOrderBtn.onclick = () => {
                nav.showView('satishlar'); 
                handleEditOrder(debt.satisNo);
            };
            actionCell.appendChild(goToOrderBtn);
        });
    };

    const fetchAndRenderDebts = async () => {
        if (!borclarView) return;
        const searchTerm = borclarSearchInput.value.trim();
        let url = '/api/debts';
        if (searchTerm) {
            url += `?company=${encodeURIComponent(searchTerm)}`;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Borcları yükləmək mümkün olmadı.');
            const debts = await response.json();
            renderDebtsTable(debts);
        } catch (error) {
            console.error("Borclar yüklənərkən xəta:", error);
            if (borclarTableBody) borclarTableBody.innerHTML = `<tr><td colspan="6" class="error-message">${error.message}</td></tr>`;
        }
    };


    // --- WebSocket Məntiqi ---
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}`);

    socket.onopen = () => console.log('WebSocket bağlantısı quruldu.');
    socket.onclose = () => console.log('WebSocket bağlantısı kəsildi.');
    socket.onerror = (error) => console.error('WebSocket xətası:', error);

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'history') {
            chatMessages.innerHTML = '';
            message.data.forEach(msg => displayMessage(msg));
        } else if (message.type === 'message') {
            displayMessage(message.data);
        }
    };
    
    const displayMessage = (msg) => {
        const messageElement = document.createElement('div');
        const isOwn = msg.sender === currentUserDisplayName;
        messageElement.className = `chat-message ${isOwn ? 'own' : 'other'}`;
        const messageTime = new Date(msg.timestamp).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
        messageElement.innerHTML = `
            ${!isOwn ? `<div class="sender">${msg.sender}</div>` : ''}
            <div class="message-text">${msg.text}</div>
            <div class="timestamp">${messageTime}</div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (text) {
            socket.send(JSON.stringify({ text }));
            chatInput.value = '';
        }
    };
    
    // --- Hadisə Dinləyiciləri ---
    
    if (showAddOrderFormBtn) {
        showAddOrderFormBtn.addEventListener('click', () => {
            resetModalToCreateMode(); 
            modal.style.display = 'block';
            stopMascotLifeCycle();
            moveMascotToElement(document.getElementById('turist'), 'Yeni sifarişə başlayaq!');
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
            resetMascotPosition();
        });
    }

    if (closeNoteModalBtn) closeNoteModalBtn.addEventListener('click', () => noteModal.style.display = 'none');
    window.addEventListener('click', (e) => { 
        if(e.target === modal) {
             modal.style.display = 'none';
             resetMascotPosition();
        }
        if(e.target === noteModal) noteModal.style.display = 'none';
    });
    
    document.body.addEventListener('input', (e) => {
        if (e.target.matches('.cost-input, .hotel-price-input')) {
            calculateTotalCost();
        }
    });

    if (hotelEntriesContainer) {
        hotelEntriesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-hotel-btn')) {
                e.target.closest('.hotel-entry').remove();
                calculateTotalCost();
            }
        });
    }
    
    if (addHotelBtn) addHotelBtn.addEventListener('click', () => addHotelEntry());
    if (searchButton) searchButton.addEventListener('click', handleSearchOrder);
    if (generateReportBtn) generateReportBtn.addEventListener('click', generateAndDisplayReport);
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', fetchOrdersAndRender);
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => {
        document.getElementById('filterYear').value = '';
        document.getElementById('filterMonth').value = '';
        document.getElementById('filterDate').value = '';
        fetchOrdersAndRender();
    });
    if (applyReservationFiltersBtn) applyReservationFiltersBtn.addEventListener('click', fetchReservationsAndRender);
    if (resetReservationFiltersBtn) resetReservationFiltersBtn.addEventListener('click', () => {
        reservationFilterHotelNameInput.value = '';
        reservationFilterMonthInput.value = '';
        reservationFilterDateInput.value = '';
        fetchReservationsAndRender();
    });
    if (chatSendBtn) chatSendBtn.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    if (borclarSearchBtn) borclarSearchBtn.addEventListener('click', fetchAndRenderDebts);


    const setupNavigation = () => {
        const views = { satishlar: satishlarView, rezervasiyalar: rezervasiyalarView, bildirishler: bildirishlerView, axtarish: searchView, hesabat: hesabatView, chat: chatView, borclar: borclarView };
        const buttons = { satishlar: navSatishlarBtn, rezervasiyalar: navRezervasiyalarBtn, bildirishler: navBildirishlerBtn, axtarish: navAxtarishBtn, hesabat: navHesabatBtn, chat: navChatBtn, borclar: navBorclarBtn };
        const showView = (viewId) => {
            Object.values(views).forEach(v => v ? v.style.display = 'none' : null);
            Object.values(buttons).forEach(b => b ? b.classList.remove('active') : null);
            if(views[viewId]) views[viewId].style.display = 'block';
            if(buttons[viewId]) buttons[viewId].classList.add('active');
        };
        Object.keys(buttons).forEach(key => {
            if (buttons[key]) buttons[key].addEventListener('click', () => {
                showView(key);
                if (key === 'satishlar') fetchOrdersAndRender();
                if (key === 'rezervasiyalar') fetchReservationsAndRender();
                if (key === 'bildirishler') fetchAndRenderNotifications();
                if (key === 'borclar') fetchAndRenderDebts();
            });
        });
        showView('satishlar');
        return { showView };
    };
    
    // İlkin Yükləmə
    const nav = setupNavigation();
    fetchOrdersAndRender();
    fetchAndRenderNotifications();

    function triggerMilestoneCelebration(count) {
        const celebrationDiv = document.getElementById('milestone-celebration');
        const milestoneText = document.getElementById('milestone-text');

        if (!celebrationDiv || !milestoneText) return;

        milestoneText.textContent = `Təbriklər, ${count}-cı Sifariş!`;
        
        celebrationDiv.style.display = 'flex';
        setTimeout(() => celebrationDiv.classList.add('visible'), 100);

        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);

        setTimeout(() => {
            celebrationDiv.classList.remove('visible');
            setTimeout(() => celebrationDiv.style.display = 'none', 500);
        }, 7000);
    }
    
    if (localStorage.getItem('mascot_enabled') !== 'false') {
        setTimeout(mascotLifeCycle, 2000);
    }
    
    if (mascotOnBtn) {
        mascotOnBtn.addEventListener('click', () => {
            if (!wanderingInterval && !mascotContainer.classList.contains('following')) {
                mascotLifeCycle();
            }
        });
    }

    // --- MASKOT MƏNTİQİ ---
    if (mascotBubble) {
        const messages = [
            "Uğurlu işlər!", "Yeni sifariş var?", "Qəhvə fasiləsi vaxtıdır?", "Hesabatları yoxladınızmı?", "Azerweys ilə səyahət başqadır!", "Müştərilər məmnundurmu?"
        ];
        setInterval(() => {
            if (localStorage.getItem('mascot_enabled') === 'false' || mascotContainer.classList.contains('mascot-alert') || mascotContainer.classList.contains('following')) return;
            const randomIndex = Math.floor(Math.random() * messages.length);
            mascotBubble.textContent = messages[randomIndex];
        }, 15000); 
    }

    const mascotHoldingNumber = document.getElementById('mascot-holding-number');
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function runStealAnimation() {
        if (localStorage.getItem('mascot_enabled') === 'false' || mascotContainer.classList.contains('mascot-alert') || mascotContainer.classList.contains('following')) {
            return;
        }
        
        const totalOrdersElAnim = document.getElementById('totalOrders');
        const satishlarViewAnim = document.getElementById('satishlarView');

        if (!mascotContainer || !totalOrdersElAnim || !satishlarViewAnim || satishlarViewAnim.style.display === 'none') {
            return;
        }
        mascotContainer.style.transition = 'none';
        mascotContainer.style.transform = `translate(0, 0)`;
        mascotHoldingNumber.style.opacity = '0';
        totalOrdersElAnim.classList.remove('grabbed');
        await sleep(100);
        const rect = totalOrdersElAnim.getBoundingClientRect();
        const mascotRect = mascotContainer.getBoundingClientRect();
        const targetX = rect.left - mascotRect.left + (rect.width / 2) - (mascotRect.width / 2);
        const targetY = rect.top - mascotRect.top;
        mascotContainer.style.transition = 'transform 1.5s ease-in-out';
        mascotContainer.style.transform = `translate(${targetX}px, ${targetY}px)`;
        await sleep(1600);
        const numberToSteal = totalOrdersElAnim.textContent;
        mascotHoldingNumber.textContent = numberToSteal;
        mascotHoldingNumber.style.opacity = '1';
        totalOrdersElAnim.classList.add('grabbed');
        await sleep(500);
        mascotContainer.classList.add('is-grabbing');
        const runToX = window.innerWidth - mascotRect.left - mascotRect.width;
        const runToY = window.innerHeight - mascotRect.top - mascotRect.height;
        mascotContainer.style.transform = `translate(${runToX}px, ${runToY}px) scale(0.5)`;
        await sleep(2600);
        mascotContainer.style.transition = 'opacity 0.5s ease';
        mascotContainer.style.opacity = '0';
        await sleep(500);
        totalOrdersElAnim.classList.remove('grabbed');
        mascotContainer.style.transition = 'none';
        mascotContainer.style.transform = `translate(0, 0)`;
        mascotContainer.style.opacity = '1';
        mascotContainer.classList.remove('is-grabbing');
    }

    function wanderMascot() {
        if (localStorage.getItem('mascot_enabled') === 'false' || !mascotContainer || mascotContainer.classList.contains('mascot-alert') || mascotContainer.classList.contains('following')) return;
        const mascotRect = mascotContainer.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const maxX = screenWidth - mascotRect.width;
        const maxY = screenHeight - mascotRect.height;
        const randomX = Math.floor(Math.random() * maxX);
        const randomY = Math.floor(Math.random() * maxY);
        mascotContainer.style.transition = 'transform 7s linear'; 
        mascotContainer.style.transform = `translate(${randomX}px, ${randomY}px)`;
    }

    async function mascotLifeCycle() {
        if (localStorage.getItem('mascot_enabled') === 'false' || modal.style.display === 'block') {
            if(wanderingInterval) clearInterval(wanderingInterval);
            return;
        }
        wanderMascot();
        wanderingInterval = setInterval(wanderMascot, 8000);
        stealAnimationTimeout = setTimeout(async () => {
            if (wanderingInterval) {
                clearInterval(wanderingInterval);
                wanderingInterval = null;
            }
            await runStealAnimation();
            mascotLifeCycle();
        }, 45000);
    }
    
    function stopMascotLifeCycle() {
        if (wanderingInterval) {
            clearInterval(wanderingInterval);
            wanderingInterval = null;
        }
        if (stealAnimationTimeout) {
            clearTimeout(stealAnimationTimeout);
            stealAnimationTimeout = null;
        }
    }

    function moveMascotToElement(targetElement, text) {
        if (!mascotContainer || !isMascotEnabled) return;

        stopMascotLifeCycle();
        mascotContainer.classList.add('following');
        const targetRect = targetElement.getBoundingClientRect();
        const mascotRect = mascotContainer.getBoundingClientRect();
        
        const targetX = targetRect.right - (mascotRect.width / 2) + 10;
        const targetY = targetRect.top + (targetRect.height / 2) - (mascotRect.height / 2);

        mascotContainer.style.transform = `translate(${targetX}px, ${targetY}px)`;
        
        if (mascotBubble && text) {
            updateMascotBubble(text);
        }
    }

    function resetMascotPosition() {
        if (!mascotContainer || !isMascotEnabled) return;
        
        mascotContainer.classList.remove('following');
        mascotContainer.style.transform = 'translate(0, 0)';

        updateMascotBubble(null);
        
        stopMascotLifeCycle();
        setTimeout(mascotLifeCycle, 2000);
    }

    function updateMascotBubble(text) {
        if (!mascotBubble) return;

        if (text && isMascotEnabled) {
            mascotBubble.textContent = text;
            mascotBubble.classList.add('visible');
        } else {
            mascotBubble.classList.remove('visible');
        }
    }
});