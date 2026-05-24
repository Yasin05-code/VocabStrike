import axios from 'axios';

// 🎯 CANLI BACKEND ADRESİN
const API_BASE_URL = "https://vocabstrike-backend.onrender.com"; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 🔒 KULLANICI GİRİŞ/KAYIT ENDPOINT'LERİ
export const registerUser = (userData) => api.post('/api/auth/register', userData);
export const loginUser = (credentials) => api.post('/api/auth/login', credentials);

// 📚 KELİME VE OYUN ENDPOINT'LERİ
export const getWords = (targetLevel, count) => api.get(`/api/words?level=${targetLevel}&count=${count}`);

// 🎯 Çakışmayı önlemek için 'level' parametresini 'xpLevel' olarak güncelledik
export const addXp = (kullanici_id, xpLevel, dogru_sayisi, yanlis_sayisi) => 
  api.post('/api/user/add-xp', { 
    kullanici_id: kullanici_id, 
    level: xpLevel, 
    dogru_sayisi: dogru_sayisi, 
    yanlis_sayisi: yanlis_sayisi 
  });

// 🏆 CANLI SIRALAMA ENDPOINT'İ
export const getLiveLeaderboard = () => api.get('/api/leaderboard');

// 📝 HATA DEFTERİ ENDPOINT'LERİ
export const getHataDefteri = (kullanici_id) => api.get(`/api/hata-defteri?kullanici_id=${kullanici_id}`);
export const addHataKelime = (kullanici_id, wordData) => api.post(`/api/hata-defteri?kullanici_id=${kullanici_id}`, wordData);
export const deleteHataKelime = (kelime_id, kullanici_id) => api.delete(`/api/hata-defteri/${kelime_id}?kullanici_id=${kullanici_id}`);

export default api;