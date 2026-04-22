const express = require('express');
const cors = require('cors');
const { Rcon } = require('rcon-client'); // Проверь, что скобки есть!
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_NICKNAME = 'WorldMod'; 

const DATA_FILE = './database.json';
let data = { users: {}, promoCodes: {} };

if (fs.existsSync(DATA_FILE)) {
    data = JSON.parse(fs.readFileSync(DATA_FILE));
}

const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// Исправленный блок инициализации Rcon
const rcon = new Rcon({
    host: '45.131.109.151',
    port: 25575,
    password: '232013' // НЕ ЗАБУДЬ ПОСТАВИТЬ СВОЙ ПАРОЛЬ
});

// Безопасное подключение
rcon.connect()
    .then(() => console.log("RCON подключен успешно!"))
    .catch(err => console.error("Ошибка RCON:", err.message));

// Регистрация / Логин
app.post('/api/auth', (req, res) => {
    const { nickname } = req.body;
    if (!data.users[nickname]) {
        data.users[nickname] = { nickname, balance: 0 };
        save();
    }
    res.json(data.users[nickname]);
});

// Покупка товара
app.post('/api/buy', async (req, res) => {
    const { nickname, rankId, price } = req.body;
    const user = data.users[nickname];

    if (!user || user.balance < price) {
        return res.status(400).json({ error: 'Недостаточно Fables' });
    }

    user.balance -= price;
    save();

    try {
        let command = "";
        if (rankId === 'case_donate') {
            command = `crate give ${nickname} DonateCase 1`;
        } else if (rankId === 'unban') {
            command = `pardon ${nickname}`;
        } else {
            command = `lp user ${nickname} parent set ${rankId}`;
        }

        const response = await rcon.send(command);
        res.json({ success: true, balance: user.balance, response });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка RCON. Но баланс списан!' });
    }
});

// АДМИНКА: Консоль (ТОЛЬКО ДЛЯ WORLDMOD)
app.post('/api/admin/command', async (req, res) => {
    const { nickname, command } = req.body;
    if (nickname !== ADMIN_NICKNAME) {
        return res.status(403).json({ error: 'НЕТ ДОСТУПА' });
    }

    try {
        const response = await rcon.send(command);
        res.json({ response });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка RCON' });
    }
});

// АДМИНКА: Начисление баланса (ТОЛЬКО ДЛЯ WORLDMOD)
app.post('/api/admin/add-money', (req, res) => {
    const { adminNick, targetNick, amount } = req.body;
    if (adminNick !== ADMIN_NICKNAME) return res.status(403).send('No');

    if (data.users[targetNick]) {
        data.users[targetNick].balance += parseFloat(amount);
        save();
        res.json({ success: true, newBalance: data.users[targetNick].balance });
    } else {
        res.status(404).json({ error: 'Игрок не найден' });
    }
});

// АДМИНКА: Создание промокода (ТОЛЬКО ДЛЯ WORLDMOD)
app.post('/api/admin/create-promo', (req, res) => {
    const { adminNick, code, reward } = req.body;
    if (adminNick !== ADMIN_NICKNAME) return res.status(403).send('No');

    data.promoCodes[code] = parseFloat(reward);
    save();
    res.json({ success: true });
});

// Использование промокода (Для всех)
app.post('/api/use-promo', (req, res) => {
    const { nickname, code } = req.body;
    const reward = data.promoCodes[code];

    if (reward) {
        data.users[nickname].balance += reward;
        delete data.promoCodes[code]; // Одноразовый
        save();
        res.json({ success: true, reward, newBalance: data.users[nickname].balance });
    } else {
        res.status(400).json({ error: 'Неверный код' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
