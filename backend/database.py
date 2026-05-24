import sqlite3
import os
import json

DB_FILE = "kelime_oyunu.db"

def get_db_connection():
    return sqlite3.connect(DB_FILE)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 🚨 Eski harf uzunluğu şemasını tamamen temizliyoruz
    cursor.execute("DROP TABLE IF EXISTS kelimeler")
    
    # Tabloları oluştur
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kullanicilar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kullanici_adi VARCHAR(50) UNIQUE NOT NULL,
            isim VARCHAR(50) NOT NULL,
            soyisim VARCHAR(50) NOT NULL,
            sifre VARCHAR(256) NOT NULL,
            xp INTEGER DEFAULT 0
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kelimeler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ingilizce VARCHAR(100) UNIQUE,
            turkce VARCHAR(100),
            seviye VARCHAR(10)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hata_defteri (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kullanici_id INTEGER,
            ingilizce VARCHAR(100),
            turkce VARCHAR(100),
            seviye VARCHAR(10) DEFAULT 'A1',
            eklenme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 🎯 YENİ HİYERARŞİK JSON OKUMA MOTORU
    current_dir = os.path.dirname(os.path.abspath(__file__))
    JSON_DOSYA_YOLU = os.path.join(current_dir, "words.json")
    
    if os.path.exists(JSON_DOSYA_YOLU):
        try:
            with open(JSON_DOSYA_YOLU, "r", encoding="utf-8") as f:
                seviyeli_liste = json.load(f) # Gelen format: {"A1": [...], "A2": [...]}
            
            enjekte_verisi = []
            
            # Sözlükteki her bir seviye grubunu ("A1", "A2", "B1", "B2") tek tek dönüyoruz
            for seviye_anahtari, kelime_listesi in seviyeli_liste.items():
                print(f"📦 {seviye_anahtari} kategorisinden kelimeler ayıklanıyor...")
                
                for item in kelime_listesi:
                    ing = item.get("en", "").strip().lower()
                    tur = item.get("tr", "").strip().lower()
                    
                    if ing and tur:
                        # Harf sayısına bakmaksızın JSON'daki gerçek seviyeyi (A1, B2 vs.) yazıyoruz
                        enjekte_verisi.append((ing, tur, seviye_anahtari.strip().upper()))
            
            # Veritabanına mükemmel toplu enjeksiyon
            cursor.executemany(
                "INSERT OR IGNORE INTO kelimeler (ingilizce, turkce, seviye) VALUES (?, ?, ?)", 
                enjekte_verisi
            )
            print(f"🎯 MÜKEMMEL BAŞARI: Toplam {len(enjekte_verisi)} adet kelime GERÇEK SEVİYELERİYLE SQLite'a mühürlendi!")
            
        except Exception as e:
            print("❌ Yeni JSON yapısı ayrıştırılırken hata oluştu:", e)
    else:
        print("⚠️ Kritik Hata: Güncel words.json dosyası backend klasöründe bulunamadı!")

    conn.commit()
    cursor.close()
    conn.close()