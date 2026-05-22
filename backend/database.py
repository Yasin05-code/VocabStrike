import mysql.connector
from datetime import datetime

DB_CONFIG = {
    "host": "localhost",
    "user": "root",          
    "password": "Yasin05kaya.", # Kendi Workbench şifreni buraya yaz!
    "database": "kelime_oyunu" 
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Kullanıcılar Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kullanicilar (
            kullanici_adi VARCHAR(50) PRIMARY KEY,
            isim VARCHAR(50) NOT NULL,
            soyisim VARCHAR(50) NOT NULL,
            sifre VARCHAR(64) NOT NULL,
            haftalik_soru INT DEFAULT 0,
            haftalik_dogru INT DEFAULT 0,
            en_yuksek_streak INT DEFAULT 0
        )
    ''')
    
    # Kelimeler Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kelimeler (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ingilizce VARCHAR(100) UNIQUE,
            turkce VARCHAR(100),
            seviye VARCHAR(10)
        )
    ''')
    
    # Hata Sözlüğü Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hata_sozlugu (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kullanici_adi VARCHAR(50),
            ingilizce VARCHAR(100),
            turkce VARCHAR(100),
            UNIQUE KEY uq_user_word (kullanici_adi, ingilizce),
            FOREIGN KEY (kullanici_adi) REFERENCES kullanicilar(kullanici_adi) ON DELETE CASCADE
        )
    ''')

    # Haftalık Skorlar Tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS haftalik_skorlar (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kullanici_adi VARCHAR(50),
            yil INT,
            hafta_no INT,
            soru_sayisi INT,
            dogru_sayisi INT,
            FOREIGN KEY (kullanici_adi) REFERENCES kullanicilar(kullanici_adi) ON DELETE CASCADE
        )
    ''')

    # Sistem Ayarları
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sistem_ayarlari (
            ayar_anahtar VARCHAR(50) PRIMARY KEY,
            ayar_deger VARCHAR(50)
        )
    ''')
    
    # Eğer kelimeler tablosu boşsa ilk kelimeleri enjekte et
    cursor.execute("SELECT COUNT(*) FROM kelimeler")
    if cursor.fetchone()[0] == 0:
        hazir_kelimeler = [
            ("also", "ayrıca", "A1"), ("mistake", "hata", "A1"), ("discover", "keşfetmek", "A1"), 
            ("even", "hatta", "A1"), ("decision", "karar", "A1"), ("between", "arasında", "A1"),
            ("whole", "tüm", "A1"), ("tale", "masal", "A1"), ("cheap", "ucuz", "A1"), ("price", "fiyat", "A1"),
            ("seriously", "cidden", "A2"), ("amongst", "arasında", "A2"), ("adventure", "macera", "A2"),
            ("common", "yaygın", "A2"), ("imagine", "hayal etmek", "A2"), ("protect", "korumak", "A2"),
            ("discuss", "tartışmak", "A2"), ("reason", "sebep", "A2"), ("move", "hareket etmek", "A2"), ("wish", "dilek", "A2"),
            ("brilliant", "muhteşem", "B1"), ("criminal", "suçlu", "B1"), ("escalator", "yürüyen merdiven", "B1"),
            ("confident", "kendinden emin", "B1"), ("vanished", "ortadan kaybolmak", "B1"), ("facility", "tesis", "B1"),
            ("independent", "bağımsız", "B1"), ("gather", "toplamak", "B1"), ("accurate", "doğru", "B1"), ("blame", "suçlamak", "B1"),
            ("expectations", "beklenti", "B2"), ("critics", "eleştirmenler", "B2"), ("treatment", "tedavi", "B2"),
            ("imaginative", "yaratıcı", "B2"), ("legacy", "miras", "B2"), ("dreadful", "korkunç", "B2"),
            ("appreciate", "takdir etmek", "B2"), ("embarrass", "utanmak", "B2"), ("assume", "farz etmek", "B2"), ("flawless", "kusursuz", "B2"),
            ("hubris", "kibir", "C1"), ("delicate", "hassas", "C1"), ("miserable", "sefil", "C1"),
            ("colleague", "iş arkadaşı", "C1"), ("delegate", "temsilci", "C1"), ("disgust", "iğrençlik", "C1"),
            ("widespread", "yaygın/çaplı", "C1"), ("deny", "inkar etmek", "C1"), ("threaten", "tehdit etmek", "C1"), ("achieve", "başarmak", "C1")
        ]
        cursor.executemany("INSERT IGNORE INTO kelimeler (ingilizce, turkce, seviye) VALUES (%s, %s, %s)", hazir_kelimeler)
        
    conn.commit()
    cursor.close()
    conn.close()

def check_weekly_reset():
    su_an = datetime.now()
    mevcut_yil = su_an.year
    mevcut_hafta = su_an.isocalendar()[1]
    mevcut_kod = f"{mevcut_yil}-{mevcut_hafta}"

    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT ayar_deger FROM sistem_ayarlari WHERE ayar_anahtar = 'son_sifirlama_haftasi'")
    row = cursor.fetchone()
    
    if not row:
        cursor.execute("INSERT INTO sistem_ayarlari (ayar_anahtar, ayar_deger) VALUES ('son_sifirlama_haftasi', %s)", (mevcut_kod,))
        conn.commit()
    else:
        son_kod = row[0]
        if son_kod != mevcut_kod:
            cursor.execute("""
                INSERT INTO haftalik_skorlar (kullanici_adi, yil, hafta_no, soru_sayisi, dogru_sayisi)
                SELECT kullanici_adi, %s, %s, haftalik_soru, haftalik_dogru FROM kullanicilar WHERE haftalik_soru > 0
            """, (mevcut_yil, mevcut_hafta))
            cursor.execute("UPDATE kullanicilar SET haftalik_soru = 0, haftalik_dogru = 0")
            cursor.execute("UPDATE sistem_ayarlari SET ayar_deger = %s WHERE ayar_anahtar = 'son_sifirlama_haftasi'", (mevcut_kod,))
            conn.commit()
            
    cursor.close()
    conn.close()