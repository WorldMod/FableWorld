import os
import hashlib
import sqlite3
from flask import Flask, render_template, request, redirect, session, url_for

app = Flask(__name__)
app.secret_key = "fableworld_ultra_key_2026"

# Данные AnyPay
ANYPAY_ID = "33633"
ANYPAY_SECRET = "8Hb9evSnS1mwNqgvQTPjwjwdog18FNI3CC992YS"

def get_db():
    db = sqlite3.connect("database.db")
    db.row_factory = sqlite3.Row
    return db

# Создание таблиц при первом запуске
with get_db() as conn:
    conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, nick TEXT UNIQUE, pass TEXT, balance REAL DEFAULT 0)")

@app.route('/')
def index():
    user = None
    if 'user_nick' in session:
        with get_db() as conn:
            user = conn.execute("SELECT * FROM users WHERE nick = ?", (session['user_nick'],)).fetchone()
    return render_template('index.html', user=user)

@app.route('/auth', methods=['POST'])
def auth():
    nick = request.form.get('nick').strip()
    password = request.form.get('pass').strip()
    action = request.form.get('action')

    with get_db() as conn:
        if action == 'reg':
            try:
                conn.execute("INSERT INTO users (nick, pass) VALUES (?, ?)", (nick, password))
                conn.commit()
                session['user_nick'] = nick
            except:
                return "Ник уже занят!"
        else:
            user = conn.execute("SELECT * FROM users WHERE nick = ? AND pass = ?", (nick, password)).fetchone()
            if user:
                session['user_nick'] = nick
            else:
                return "Неверные данные!"
    return redirect(url_for('index'))

@app.route('/logout')
def logout():
    session.pop('user_nick', None)
    return redirect(url_for('index'))

@app.route('/buy/<item>/<int:price>')
def buy(item, price):
    if 'user_nick' not in session: return redirect(url_for('index'))
    pay_id = str(os.urandom(3).hex())
    hash_str = f"RUB:{price}:{ANYPAY_SECRET}:{ANYPAY_ID}:{pay_id}"
    sign = hashlib.sha256(hash_str.encode()).hexdigest()
    url = f"https://anypay.io/merchant?merchant_id={ANYPAY_ID}&amount={price}&pay_id={pay_id}&currency=RUB&sign={sign}&desc=FableWorld:{item}"
    return redirect(url)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
    
