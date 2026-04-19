import os
import hashlib
from flask import Flask, render_template, redirect

app = Flask(__name__)
app.secret_key = "fableworld_2026_super_key"

ANYPAY_ID = "33633"
ANYPAY_SECRET = "8Hb9evSnS1mwNqgvQTPjwjwdog18FNI3CC992YS"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/anypay-verification.txt')
def anypay_verify():
    return "aaeff3cc76f30526caf08a3e0be1"

@app.route('/buy/<item>/<int:price>')
def buy(item, price):
    pay_id = str(os.urandom(3).hex())
    currency = "RUB"
    # Формула SHA256 для AnyPay
    hash_str = f"{currency}:{price}:{ANYPAY_SECRET}:{ANYPAY_ID}:{pay_id}"
    sign = hashlib.sha256(hash_str.encode()).hexdigest()
    
    url = (f"https://anypay.io/merchant?merchant_id={ANYPAY_ID}&amount={price}"
           f"&pay_id={pay_id}&currency={currency}&sign={sign}&desc=FableWorld:{item}")
    return redirect(url)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
    
