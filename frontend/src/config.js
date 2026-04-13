// Production and Development URL configuration
const IS_PROD = process.env.NODE_ENV === 'production' || !__DEV__;

// Replace with your Render/Production URL once deployed
// Forcing production URL for testing the online deployment
export const API_BASE_URL = 'https://nativechat-d02y.onrender.com';
// export const API_BASE_URL = IS_PROD 
//     ? 'https://nativechat-d02y.onrender.com' 
//     : 'http://10.193.65.99:5000';

export const SOCKET_URL = API_BASE_URL;
export const API_URL = `${API_BASE_URL}/api`;
