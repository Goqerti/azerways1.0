document.addEventListener('DOMContentLoaded', () => {
    const passwordPrompt = document.getElementById('passwordPrompt');
    const permissionsPanel = document.getElementById('permissionsPanel');
    const verifyOwnerBtn = document.getElementById('verifyOwnerBtn');
    const ownerPasswordInput = document.getElementById('ownerPassword');
    const permissionsTableBody = document.getElementById('permissionsTableBody');
    const savePermissionsBtn = document.getElementById('savePermissionsBtn');
    const messageContainer = document.getElementById('messageContainer');

    let ownerVerified = false;

    const showMessage = (text, type = 'error') => {
        messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => messageContainer.innerHTML = '', 3000);
    };

    const fetchAndRenderPermissions = async () => {
        try {
            const response = await fetch('/api/permissions');
            if (!response.ok) throw new Error('İcazələri yükləmək mümkün olmadı.');
            
            const permissions = await response.json();
            permissionsTableBody.innerHTML = '';
            
            const roleNames = {
                sales_manager: 'Sales Manager',
                coordinator: 'Coordinator',
                reservation: 'Reservation',
                finance: 'Finance'
            };

            for (const role in permissions) {
                const perms = permissions[role];
                const row = permissionsTableBody.insertRow();
                row.dataset.role = role;
                
                row.insertCell().textContent = roleNames[role] || role;
                row.insertCell().innerHTML = `<input type="checkbox" class="perm-checkbox" data-permission="canEditOrder" ${perms.canEditOrder ? 'checked' : ''}>`;
                row.insertCell().innerHTML = `<input type="checkbox" class="perm-checkbox" data-permission="canEditFinancials" ${perms.canEditFinancials ? 'checked' : ''}>`;
                row.insertCell().innerHTML = `<input type="checkbox" class="perm-checkbox" data-permission="canDeleteOrder" ${perms.canDeleteOrder ? 'checked' : ''}>`;
            }

        } catch (error) {
            showMessage(error.message);
        }
    };

    verifyOwnerBtn.addEventListener('click', async () => {
        const password = ownerPasswordInput.value;
        if (!password) {
            showMessage('Zəhmət olmasa, parolu daxil edin.');
            return;
        }
        try {
            const response = await fetch('/api/verify-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                ownerVerified = true;
                passwordPrompt.style.display = 'none';
                permissionsPanel.style.display = 'block';
                await fetchAndRenderPermissions();
            } else {
                const error = await response.json();
                showMessage(error.message || 'Parol yanlışdır.');
            }
        } catch (error) {
            showMessage('Yoxlama zamanı xəta baş verdi.');
        }
    });

    savePermissionsBtn.addEventListener('click', async () => {
        if (!ownerVerified) {
            showMessage('Yoxlama keçməmisiniz.');
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
            const response = await fetch('/api/permissions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPermissions)
            });

            if (response.ok) {
                showMessage('İcazələr uğurla yadda saxlandı.', 'success');
            } else {
                const error = await response.json();
                showMessage(error.message || 'Yadda saxlama zamanı xəta.');
            }
        } catch (error) {
            showMessage('Yadda saxlama zamanı xəta baş verdi.');
        }
    });
});
