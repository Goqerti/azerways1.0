document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');

    const otp = document.getElementById('otp').value;
    const newPassword = document.getElementById('newPassword').value;
    const messageContainer = document.getElementById('messageContainer');
    const submitButton = e.target.querySelector('button');

    if (!username) {
        showMessage('İstifadəçi tapılmadı. Zəhmət olmasa, əvvəlki səhifəyə qayıdın.', 'error');
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = 'Yoxlanılır...';

    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, otp, newPassword })
        });
        const result = await response.json();
        
        if (response.ok) {
            showMessage(result.message, 'success');
            // Redirect to login page after a delay
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            showMessage(result.message, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Şifrəni Dəyiş';
        }
    } catch (error) {
        showMessage('Serverlə əlaqə xətası. Zəhmət olmasa, sonra yenidən cəhd edin.', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'Şifrəni Dəyiş';
    }
});

function showMessage(text, type) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
}
