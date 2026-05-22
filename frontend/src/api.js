import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
});

export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const getWords = (level, count) => API.get(`/words?level=${level}&count=${count}`);
export const getHataDefteri = (kullaniciId) => API.get(`/hata-defteri?kullanici_id=${kullaniciId}`);
export const addHataKelime = (kullaniciId, kelimeData) => API.post(`/hata-defteri?kullanici_id=${kullaniciId}`, kelimeData);
export const deleteHataKelime = (kelimeId, kullaniciId) => API.delete(`/hata-defteri/${kelimeId}?kullanici_id=${kullaniciId}`);

export default API;