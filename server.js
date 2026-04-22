const express = require('express');
const cors = require('cors');
const { Rcon } = require('rcon-client');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_NICKNAME = 'WorldMod'; 
const DATA_FILE = './database.json';

// База данных (создаем если нет)
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, promoCodes: {} }));
let data = JSON.parse(fs.readFileSync(DATA_FILE));
const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// Настройка RCON
const rcon = new Rcon({
    host: '45.131.109.151',
    port: 25575,
    password: 'ТВОЙ_ПАРОЛЬ' 
});

// Функция отправки команд (не роняет сервер)
async function sendCmd(cmd) {
    try {
        if (!rcon.connected) await rcon.connect();
        return await rcon.send(cmd);
    } catch (e) { return "Ошибка RCON"; }
}

// РАЗДАЧА МАГАЗИНА (Чтобы по ссылке был сайт, а не текст)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Логика магазина
app.post('/api/auth', (req, res) => {
    const { nickname } = req.body;
    if (!data.users[nickname]) { data.users[nickname] = { nickname, balance: 0 }; save(); }
    res.json(data.users[nickname]);
});

app.post('/api/buy', async (req, res) => {
    const { nickname, rankId, price } = req.body;
    const user = data.users[nickname];
    if (!user || user.balance < price) return res.status(400).send('No balance');
    user.balance -= price;
    save();
    const cmd = rankId === 'unban' ? `pardon ${nickname}` : `lp user ${nickname} parent set ${rankId}`;
    await sendCmd(cmd);
    res.json({ success: true, balance: user.balance });
});

app.post('/api/admin/add-money', (req, res) => {
    if (req.body.adminNick !== ADMIN_NICKNAME) return res.status(403).send('No');
    if (data.users[req.body.targetNick]) {
        data.users[req.body.targetNick].balance += parseFloat(req.body.amount);
        save();
        res.json({ success: true });
    } else res.status(404).send('Not found');
});

app.post('/api/admin/command', async (req, res) => {
    if (req.body.nickname !== ADMIN_NICKNAME) return res.status(403).send('No');
    const response = await sendCmd(req.body.command);
    res.json({ response });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Live on ${PORT}`));
