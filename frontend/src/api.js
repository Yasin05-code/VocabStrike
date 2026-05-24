import axios from 'axios';

const API_BASE_URL = "https://vocabstrike-backend.onrender.com"; // 🎯 Yeni canlı backend adresin

const api = axios.create({
  baseURL: API_URL,
});

export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getWords = (level, count) => api.get(`/words?level=${level}&count=${count}`);
export const getHataDefteri = (kullaniciId) => api.get(`/hata-defteri?kullanici_id=${kullaniciId}`);
export const addHataKelime = (kullaniciId, kelimeData) => api.post(`/hata-defteri?kullanici_id=${kullaniciId}`, kelimeData);
export const deleteHataKelime = (kelimeId, kullaniciId) => api.delete(`/hata-defteri/${kelimeId}?kullanici_id=${kullaniciId}`);

// 🚀 ZORLUK ALGORİTMALI PUAN SİSTEMİ KANCALARI
export const addXp = (kullaniciId, level, dogru, yanlis) => api.post('/user/add-xp', { kullanici_id: kullaniciId, level: level, dogru_sayisi: dogru, yanlis_sayisi: yanlis });
export const getLiveLeaderboard = () => api.get('/leaderboard');

export default api;