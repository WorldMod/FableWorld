const express = require('express');
const cors = require('cors');
const { Rcon } = require('rcon-client');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_NICKNAME = 'WorldMod'; 
const DATA_FILE = './database.json';

// Инициализация базы данных
let data = { users: {}, promoCodes: {} };
if (fs.existsSync(DATA_FILE)) {
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (e) {
        console.log("Database file is empty or corrupted, using default.");
    }
}

const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// Настройка RCON
const rcon = new Rcon({
    host: '45.131.109.151',
    port: 25575,
    password: '232013' // ЗАМЕНИ НА СВОЙ ПАРОЛЬ ОТ RCON
});

// Пытаемся подключиться, но не роняем сервер при ошибке
rcon.connect().catch(err => console.error("RCON Connection failed:", err.message));

app.post('/api/auth', (req, res) => {
    const { nickname } = req.body;
    if (!nickname) return res.status(400).send('No nick');
    if (!data.users[nickname]) {
        data.users[nickname] = { nickname, balance: 0 };
        save();
    }
    res.json(data.users[nickname]);
});

app.post('/api/buy', async (req, res) => {
    const { nickname, rankId, price } = req.body;
    const user = data.users[nickname];
    if (!user || user.balance < price) return res.status(400).json({ error: 'Low balance' });

    user.balance -= price;
    save();

    try {
        let command = rankId === 'unban' ? `pardon ${nickname}` : `lp user ${nickname} parent set ${rankId}`;
        await rcon.send(command);
        res.json({ success: true, balance: user.balance });
    } catch (err) {
        res.status(500).json({ error: 'RCON error' });
    }
});

app.post('/api/admin/command', async (req, res) => {
    const { nickname, command } = req.body;
    if (nickname !== ADMIN_NICKNAME) return res.status(403).send('Forbidden');
    try {
        const response = await rcon.send(command);
        res.json({ response });
    } catch (err) {
        res.status(500).json({ error: 'RCON error' });
    }
});

app.post('/api/admin/add-money', (req, res) => {
    const { adminNick, targetNick, amount } = req.body;
    if (adminNick !== ADMIN_NICKNAME) return res.status(403).send('Forbidden');
    if (data.users[targetNick]) {
        data.users[targetNick].balance += parseFloat(amount);
        save();
        res.json({ success: true });
    } else {
        res.status(404).send('Not found');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
