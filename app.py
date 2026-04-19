import os
import hashlib
import sqlite3
from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "fableworld_ultra_2026")

# --- ТВОИ ДАННЫЕ ANYPAY ---
ANYPAY_ID = "33633"  # Твой ID проекта
ANYPAY_SECRET = "8Hb9evSnS1mwNqgvQTPjwjwdog18FNI3CC992YS" # Твой ключ

@app.route('/')
def index():
    return render_template('index.html')

# Верификация для модерации
@app.route('/anypay-verification.txt')
def anypay_verify():
    return "aaeff3cc76f30526caf08a3e0be1"

# ГЕНЕРАТОР РЕАЛЬНОЙ ОПЛАТЫ
@app.route('/buy/<item>/<int:price>')
def buy(item, price):
    pay_id = str(os.urandom(3).hex()) # Случайный ID заказа
    currency = "RUB"
    
    # Подпись AnyPay: SHA256(currency:amount:secret:project_id:pay_id)
    hash_str = f"{currency}:{price}:{ANYPAY_SECRET}:{ANYPAY_ID}:{pay_id}"
    sign = hashlib.sha256(hash_str.encode()).hexdigest()
    
    # Формируем прямую ссылку на кассу
    anypay_url = (
        f"https://anypay.io/merchant?"
        f"merchant_id={ANYPAY_ID}&"
        f"amount={price}&"
        f"pay_id={pay_id}&"
        f"currency={currency}&"
        f"sign={sign}&"
        f"desc=FableWorld: {item}"
    )
    
    return redirect(anypay_url)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
            if res:
                user_data = {'name': res['username'], 'balance': res['balance']}
    return render_template('index.html', user=user_data)

# --- АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ---
@app.route('/auth', methods=['POST'])
def auth():
    user = request.form.get('username', '').lower().strip()
    pw = request.form.get('password')
    act = request.form.get('action')
    
    if not user or not pw:
        return redirect(url_for('index'))

    with get_db_connection() as conn:
        try:
            if act == 'reg':
                # Хешируем пароль и сохраняем юзера
                hashed_pw = generate_password_hash(pw)
                conn.execute("INSERT INTO users (username, password, balance) VALUES (?, ?, ?)", 
                             (user, hashed_pw, 0.0))
                conn.commit()
                session['user'] = user
            else:
                # Вход: проверяем пароль
                res = conn.execute("SELECT password FROM users WHERE username = ?", (user,)).fetchone()
                if res and check_password_hash(res['password'], pw):
                    session['user'] = user
        except sqlite3.IntegrityError:
            # Если юзер уже есть — просто ничего не делаем (можно добавить уведомление)
            pass 
    return redirect(url_for('index'))

# --- ВЫХОД ---
@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    # На Render порт берется из переменной окружения
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
