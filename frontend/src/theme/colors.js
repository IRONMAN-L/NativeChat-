export const COLORS = {
    dark: {
        background: '#0F1014',
        surface: '#1A1B22',
        surfaceHighlight: '#2A2B32',
        text: '#FFFFFF',
        textMuted: '#8A8D9F',
        border: 'rgba(255,255,255,0.1)',
        primary: '#00e5ff',
        primaryDark: '#3d5afe',
    },
    light: {
        background: '#F0F2F5',  
        surface: '#FFFFFF',     
        surfaceHighlight: '#E4E6EB', 
        text: '#050505',
        textMuted: '#65676B',
        border: 'rgba(0,0,0,0.1)',
        primary: '#00e5ff',
        primaryDark: '#3d5afe',
    }
};

export const getThemeColors = (theme) => COLORS[theme] || COLORS.dark;
