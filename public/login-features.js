document.addEventListener('DOMContentLoaded', async () => {
    // --- DİL TƏRCÜMƏSİ VƏ SEÇİMİ ---
    // Tərcümə fayllarını yüklə və səhifəni ilkin olaraq tərcümə et
    await i18n.loadTranslations(localStorage.getItem('lang') || 'az');
    i18n.translatePage();

    // Dil seçimi menyusunu aktivləşdir
    i18n.setupLanguageSwitcher('lang-switcher-login', () => {});


    // --- MASKOT VƏ ŞİFRƏ GÖSTƏRMƏ KODU ---
    const mascotContainer = document.querySelector('.mascot-login-container');
    const mascotImage = document.getElementById('loginMascot');
    const passwordInput = document.getElementById('password');
    const showPasswordToggle = document.getElementById('showPasswordToggle');
    const mascotBubble = document.getElementById('loginMascotBubble'); // Balonu əldə edirik

    // MASKOT ANİMASİYALARI
    if (mascotContainer) {
        // Səhifə yükləndikdə maskotun başını çıxarması
        setTimeout(() => {
            mascotContainer.style.bottom = '-40px'; 

            // Maskot göründükdən bir müddət sonra balonu göstər
            if (mascotBubble) {
                setTimeout(() => {
                    mascotBubble.style.opacity = '1';
                }, 700); // 0.7 saniyə sonra
            }
        }, 500);
    }

    if (showPasswordToggle && passwordInput && mascotImage) {
        // Şifrəyə baxmaq üçün checkbox dəyişdikdə
        showPasswordToggle.addEventListener('change', () => {
            if (showPasswordToggle.checked) {
                passwordInput.type = 'text';
                // Qeyd: Bu şəkillər `public` qovluğunun içindəki `images` qovluğunda olmalıdır.
                // Məsələn: public/images/mascot-eye-open.png
                mascotImage.src = 'images/mascot-eye-open.png'; 
            } else {
                passwordInput.type = 'password';
                // Orijinal şəkli geri qaytarır.
                mascotImage.src = 'mascot.png';
            }
        });
    }

    // --- YENİ İSTİFADƏÇİ YARATMA MODALI ÜÇÜN KOD ---
    const showCreateUserModalBtn = document.getElementById('showCreateUserModalBtn');
    const createUserModal = document.getElementById('createUserModal');
    
    if (createUserModal) {
        const closeModalBtn = createUserModal.querySelector('.close-button');
        const step1 = document.getElementById('step1-owner-verify');
        const step2 = document.getElementById('step2-registration-form');
        const ownerVerifyForm = document.getElementById('ownerVerifyForm');
        const modalOwnerPassword = document.getElementById('modalOwnerPassword');
        const modalErrorMessage = document.getElementById('modalErrorMessage');
        const registrationForm = document.getElementById('registrationForm');
        const regRoleSelect = document.getElementById('regRole');
        const regNewRoleInput = document.getElementById('regNewRole');
        const regMessage = document.getElementById('regMessage');

        const showModal = () => createUserModal.style.display = 'flex';
        const hideModal = () => {
            createUserModal.style.display = 'none';
            step1.style.display = 'block';
            step2.style.display = 'none';
            ownerVerifyForm.reset();
            registrationForm.reset();
            modalErrorMessage.textContent = '';
            regMessage.textContent = '';
            regNewRoleInput.style.display = 'none';
        };

        if (showCreateUserModalBtn) {
            showCreateUserModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showModal();
            });
        }

        if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
        window.addEventListener('click', (e) => {
            if (e.target === createUserModal) {
                hideModal();
            }
        });

        ownerVerifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            modalErrorMessage.textContent = '';
            try {
                const response = await fetch('/api/verify-owner', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: modalOwnerPassword.value })
                });

                if (response.ok) {
                    step1.style.display = 'none';
                    step2.style.display = 'block';
                } else {
                    const err = await response.json();
                    modalErrorMessage.textContent = err.message || 'Parol yanlışdır.';
                    modalErrorMessage.style.color = 'red';
                }
            } catch (error) {
                modalErrorMessage.textContent = 'Server xətası.';
                modalErrorMessage.style.color = 'red';
            }
        });

        regRoleSelect.addEventListener('change', () => {
            if (regRoleSelect.value === 'new_role') {
                regNewRoleInput.style.display = 'block';
                regNewRoleInput.required = true;
            } else {
                regNewRoleInput.style.display = 'none';
                regNewRoleInput.required = false;
            }
        });

        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            regMessage.textContent = '';
            
            let roleValue = regRoleSelect.value;
            if (roleValue === 'new_role') {
                roleValue = regNewRoleInput.value.trim().toLowerCase().replace(/\s+/g, '_');
                if (!roleValue) {
                    regMessage.textContent = 'Yeni vəzifə adı boş ola bilməz.';
                    regMessage.style.color = 'red';
                    return;
                }
            }

            const userData = {
                displayName: document.getElementById('regDisplayName').value,
                username: document.getElementById('regUsername').value,
                email: document.getElementById('regEmail').value,
                password: document.getElementById('regPassword').value,
                role: roleValue
            };

            try {
                const response = await fetch('/api/users/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const result = await response.json();
                if (response.ok) {
                    regMessage.textContent = result.message;
                    regMessage.style.color = 'green';
                    setTimeout(hideModal, 2000);
                } else {
                    regMessage.textContent = result.message || 'Xəta baş verdi.';
                    regMessage.style.color = 'red';
                }
            } catch (error) {
                regMessage.textContent = 'Server xətası.';
                regMessage.style.color = 'red';
            }
        });
    }

    // --- Login forması səhvini göstərmək üçün kod ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
        const errorMessageContainer = document.getElementById('errorMessageContainer');
        if (errorMessageContainer) {
            errorMessageContainer.innerHTML = `<div class="error-message">${i18n.t('loginError')}</div>`;
        }
    }
});
