import axios from 'axios';

// 🎯 ESKİ LOCALHOST TAMAMEN UÇURULDU - CANLI BACKEND ADRESİN BAĞLANDI
const API_BASE_URL = "https://vocabstrike-backend.onrender.com";

// Tüm isteklerin başına otomatik olarak canlı backend URL'ini ekleyen Axios instance'ı
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
export const getWords = (level, count) => api.get(`/api/words?level=${level}&count=${count}`);
export const addXp = (kullanici_id, level, dogru_sayisi, yanlis_sayisi) => 
  api.post('/api/user/add-xp', { kullanici_id, level, dogru_sayisi, yanlis_sayisi });

// 🏆 CANLI SIRALAMA ENDPOINT'İ
export const getLiveLeaderboard = () => api.get('/api/leaderboard');

// 📝 HATA DEFTERİ ENDPOINT'LERİ
export const getHataDefteri = (kullanici_id) => api.get(`/api/hata-defteri?kullanici_id=${kullanici_id}`);
export const addHataKelime = (kullanici_id, wordData) => api.post(`/api/hata-defteri?kullanici_id=${kullanici_id}`, wordData);
export const deleteHataKelime = (kelime_id, kullanici_id) => api.delete(`/api/hata-defteri/${kelime_id}?kullanici_id=${kullanici_id}`);

export default api;