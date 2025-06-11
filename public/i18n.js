// public/i18n.js
class I18n {
    constructor() {
        this.translations = {};
        this.currentLang = localStorage.getItem('lang') || 'az'; // Standart dil
        this.availableLangs = {
            az: 'Azərbaycanca',
            en: 'English',
            ru: 'Русский'
        };
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Tərcümə faylını yükləmək mümkün olmadı: ${lang}`);
            }
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('lang', lang);
            document.documentElement.lang = lang;
        } catch (error) {
            console.error(error);
            if (lang !== 'az') {
                await this.loadTranslations('az');
            }
        }
    }

    translatePage() {
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-key');
            const translation = this.translations[key];
            if (translation) {
                if (element.hasAttribute('placeholder')) {
                    element.setAttribute('placeholder', translation);
                } else if (element.hasAttribute('title')) {
                    element.setAttribute('title', translation);
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    t(key, replacements = {}) {
        let translation = this.translations[key] || key;
        for (const placeholder in replacements) {
            translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return translation;
    }

    async setLanguage(lang) {
        await this.loadTranslations(lang);
        this.translatePage();
    }

    // DİL DƏYİŞDİRİCİ MƏNTİQİ (ŞƏKİLSİZ)
    setupLanguageSwitcher(containerId, onLanguageChange = () => {}) {
        const switcherContainer = document.getElementById(containerId);
        if (!switcherContainer) return;

        const selectedLangDiv = switcherContainer.querySelector('.selected-lang');
        const langOptionsUl = switcherContainer.querySelector('.lang-options');

        const updateSelectedDisplay = (lang) => {
            const selectedText = selectedLangDiv.querySelector('span');
            selectedText.textContent = this.availableLangs[lang];
        };
        
        updateSelectedDisplay(this.currentLang);

        selectedLangDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            switcherContainer.classList.toggle('active');
        });

        langOptionsUl.addEventListener('click', async (e) => {
            const targetLi = e.target.closest('li[data-lang]');
            if (targetLi) {
                const lang = targetLi.getAttribute('data-lang');
                if (lang !== this.currentLang) {
                    await this.setLanguage(lang);
                    updateSelectedDisplay(lang);
                    onLanguageChange();
                }
                switcherContainer.classList.remove('active');
            }
        });
        
        document.addEventListener('click', () => {
            if (switcherContainer.classList.contains('active')) {
                switcherContainer.classList.remove('active');
            }
        });
    }
}

const i18n = new I18n();