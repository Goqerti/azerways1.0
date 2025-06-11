document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const messageContainer = document.getElementById('messageContainer');
    const submitButton = e.target.querySelector('button');
    
    // Disable button to prevent multiple clicks
    submitButton.disabled = true;
    submitButton.textContent = 'Göndərilir...';
    messageContainer.innerHTML = ''; // Clear previous messages

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const result = await response.json();
        
        if (response.ok) {
            showMessage(result.message, 'success');
            // Redirect user to the reset password page after a delay
            setTimeout(() => {
                window.location.href = `/reset-password.html?user=${encodeURIComponent(username)}`;
            }, 2000);
        } else {
            showMessage(result.message, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'OTP Kodu Göndər';
        }
    } catch (error) {
        showMessage('Serverlə əlaqə xətası. Zəhmət olmasa, sonra yenidən cəhd edin.', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'OTP Kodu Göndər';
    }
});

function showMessage(text, type) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
}
