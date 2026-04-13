export const translations = {
    en: {
        // Common
        settings: 'Settings',
        save: 'Save',
        cancel: 'Cancel',
        online: 'Online',
        offline: 'Offline',
        
        // Home / Chat List
        chats: 'Chats',
        recent: 'Recent',
        searchPlaceholder: 'Search messages...',
        
        // Navigation / Tabs
        contacts: 'Contacts',
        activity: 'Activity',
        
        // Settings Screen
        account: 'Account',
        profile: 'Profile',
        privacySecurity: 'Privacy & Security',
        notifications: 'Notifications',
        language: 'Language',
        chatSettings: 'Chat Settings',
        logout: 'Logout',
        nightMode: 'Night Mode',
        
        // Specific Screens
        selectLanguage: 'Select Language',
        appLanguageDesc: 'Choose your preferred language for the application interface.',
    },
    te: {
        // Common
        settings: 'సెట్టింగ్లు',
        save: 'సేవ్ చేయి',
        cancel: 'రద్దు చేయి',
        online: 'ఆన్‌లైన్',
        offline: 'ఆఫ్‌లైన్',
        
        // Home / Chat List
        chats: 'చాట్‌లు',
        recent: 'ఇటీవలి',
        searchPlaceholder: 'మెసేజ్‌ల కోసం వెతకండి...',
        
        // Navigation / Tabs
        contacts: 'పరిచయాలు',
        activity: 'చర్యలు',
        
        // Settings Screen
        account: 'ఖాతా',
        profile: 'ప్రొఫైల్',
        privacySecurity: 'గోప్యత & భద్రత',
        notifications: 'నోటిఫికేషన్లు',
        language: 'భాష',
        chatSettings: 'చాట్ సెట్టింగ్లు',
        logout: 'లాగౌట్',
        nightMode: 'నైట్ మోడ్',
        
        // Specific Screens
        selectLanguage: 'భాషను ఎంచుకోండి',
        appLanguageDesc: 'అప్లికేషన్ ఇంటర్ఫేస్ కోసం మీకు నచ్చిన భాషను ఎంచుకోండి.',
    },
    hi: {
        // Common
        settings: 'सेटिंग्स',
        save: 'सहेजें',
        cancel: 'रद्द करें',
        online: 'ऑनलाइन',
        offline: 'ऑफ़लाइन',
        
        // Home / Chat List
        chats: 'चैट',
        recent: 'हाल ही में',
        searchPlaceholder: 'संदेश खोजें...',
        
        // Navigation / Tabs
        contacts: 'संपर्क',
        activity: 'गतिविधि',
        
        // Settings Screen
        account: 'खाता',
        profile: 'प्रोफ़ाइल',
        privacySecurity: 'गोपनीयता और सुरक्षा',
        notifications: 'सूचनाएं',
        language: 'भाषा',
        chatSettings: 'चैट सेटिंग्स',
        logout: 'लॉगआउट',
        nightMode: 'नाइट मोड',
        
        // Specific Screens
        selectLanguage: 'भाषा चुनें',
        appLanguageDesc: 'एप्लिकेशन इंटरफ़ेस के लिए अपनी पसंदीदा भाषा चुनें।',
    }
};

export const getTranslation = (lang, key) => {
    return translations[lang]?.[key] || translations['en'][key] || key;
};
