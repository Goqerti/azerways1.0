// public/permissions.js (YEKUN VƏ TAM İŞLƏK VERSİYA)
document.addEventListener('DOMContentLoaded', () => {
    const passwordPrompt = document.getElementById('passwordPrompt');
    const permissionsPanel = document.getElementById('permissionsPanel');
    const verifyOwnerBtn = document.getElementById('verifyOwnerBtn');
    const ownerPasswordInput = document.getElementById('ownerPassword');
    const permissionsTableBody = document.getElementById('permissionsTableBody');
    const savePermissionsBtn = document.getElementById('savePermissionsBtn');
    const messageContainer = document.getElementById('messageContainer');

    const showMessage = (text, type = 'error') => {
        messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => messageContainer.innerHTML = '', 4000);
    };

    const renderPermissionsTable = (permissions) => {
        permissionsTableBody.innerHTML = '';
        const roleNames = {
            sales_manager: 'Sales Manager',
            reservation_role: 'Reservation',
            'i̇t': 'IT',
            finance: 'Finance'
        };

        for (const role in permissions) {
            if (role === 'owner') continue;
            const perms = permissions[role];
            const row = permissionsTableBody.insertRow();
            row.dataset.role = role;
            row.insertCell().textContent = roleNames[role] || role;
            row.insertCell().innerHTML = `<input type="checkbox" class="perm-checkbox" data-permission="canEditOrder" ${perms.canEditOrder ? 'checked' : ''}>`;
            row.insertCell().innerHTML = `<input type="checkbox" class="perm-checkbox" data-permission="canEditFinancials" ${perms.canEditFinancials ? 'checked' : ''}>`;
            row.insertCell().innerHTML = `<input type="checkbox" class="perm-checkbox" data-permission="canDeleteOrder" ${perms.canDeleteOrder ? 'checked' : ''}>`;
        }
    };

    verifyOwnerBtn.addEventListener('click', async () => {
        const password = ownerPasswordInput.value;
        if (!password) {
            showMessage('Zəhmət olmasa, parolu daxil edin.');
            return;
        }

        try {
            const response = await fetch('/api/permissions/get-by-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok) {
                passwordPrompt.style.display = 'none';
                permissionsPanel.style.display = 'block';
                renderPermissionsTable(data);
            } else {
                throw new Error(data.message || 'Naməlum xəta baş verdi.');
            }
        } catch (error) {
            console.error('İcazələri alarkən xəta:', error);
            showMessage(error.message);
        }
    });

    savePermissionsBtn.addEventListener('click', async () => {
        const password = ownerPasswordInput.value;
        if (!password) {
            showMessage('Təhlükəsizlik üçün Owner parolu boş ola bilməz. Zəhmət olmasa, səhifəni yeniləyib yenidən daxil olun.');
            return;
        }

        const newPermissions = {};
        const rows = permissionsTableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const role = row.dataset.role;
            newPermissions[role] = {};
            const checkboxes = row.querySelectorAll('.perm-checkbox');
            checkboxes.forEach(checkbox => {
                const permission = checkbox.dataset.permission;
                newPermissions[role][permission] = checkbox.checked;
            });
        });

        try {
            const response = await fetch('/api/permissions/save-by-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password: password, 
                    permissions: newPermissions 
                })
            });
            
            const result = await response.json();

            if (response.ok) {
                showMessage('İcazələr uğurla yadda saxlandı.', 'success');
            } else {
                throw new Error(result.message || 'Yadda saxlama zamanı xəta.');
            }
        } catch (error) {
            console.error('İcazələri yadda saxlayarkən xəta:', error);
            showMessage(error.message);
        }
    });
});
