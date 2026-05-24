import axios from 'axios';

// 🎯 CANLI BACKEND ADRESİNİZ
const API_BASE_URL = "https://vocabstrike-backend.onrender.com"; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 🔒 KULLANICI GİRİŞ/KAYIT FONKSİYONLARI
export const registerUser = (userData) => api.post('/api/auth/register', userData);
export const loginUser = (credentials) => api.post('/api/auth/login', credentials);

// 📚 KELİME VE OYUN FONKSİYONLARI
export const getWords = (targetLevel, count) => api.get(`/api/words?level=${targetLevel}&count=${count}`);
export const getHataDefteri = (kullanici_id) => api.get(`/api/hata-defteri?kullanici_id=${kullanici_id}`);
export const addHataKelime = (kullanici_id, wordData) => api.post(`/api/hata-defteri?kullanici_id=${kullanici_id}`, wordData);
export const deleteHataKelime = (kelime_id, kullanici_id) => api.delete(`/api/hata-defteri/${kelime_id}?kullanici_id=${kullanici_id}`);

// 🎯 Çakışmaları önlemek için parametre adı xpLevel olarak optimize edildi
export const addXp = (kullanici_id, xpLevel, dogru_sayisi, yanlis_sayisi) => 
  api.post('/api/user/add-xp', { 
    kullanici_id, 
    level: xpLevel, 
    dogru_sayisi, 
    yanlis_sayisi 
  });

// 🏆 CANLI SIRALAMA FONKSİYONU
export const getLiveLeaderboard = () => api.get('/api/leaderboard');

// 🛡️ HİBRİT ÇÖZÜM: App.jsx içindeki "import { getWords, ... } from './api'" yapısını kurtarır
export {
  getWords as getWords,
  getHataDefteri as getHataDefteri,
  addHataKelime as addHataKelime,
  deleteHataKelime as deleteHataKelime,
  addXp as addXp,
  getLiveLeaderboard as getLiveLeaderboard
};

// 🛡️ ESKİ USUL ÇAĞRILAR İÇİN TAM DESTEK DEFAULT NESNESİ
export default api;