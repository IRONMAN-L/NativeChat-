export const translateMessage = async (text, targetLang = 'en') => {
    try {
        // Using MyMemory free translation API for rapid, key-less prototyping
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=AUTODETECT|${targetLang}`);
        const data = await response.json();

        if (data && data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        
        return "Translation unavailable";
    } catch (error) {
        console.error("Translation Error:", error);
        return "Failed to translate";
    }
};
