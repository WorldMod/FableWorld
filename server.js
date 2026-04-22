const express = require('express');
const cors = require('cors');
const { Rcon } = require('rcon-client');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_NICKNAME = 'WorldMod'; 
const DATA_FILE = './database.json';

// Авто-создание файла базы данных, если его нет
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, promoCodes: {} }));
}

let data = JSON.parse(fs.readFileSync(DATA_FILE));
const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const rcon = new Rcon({
    host: '45.131.109.151',
    port: 25575,
    password: 'ТВОЙ_ПАРОЛЬ' // ЗАМЕНИ НА СВОЙ
});

rcon.connect().catch(err => console.log("RCON пока спит, но сервер работает"));

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
    if (!user || user.balance < price) return res.status(400).send('No money');
    user.balance -= price;
    save();
    try {
        await rcon.send(rankId === 'unban' ? `pardon ${nickname}` : `lp user ${nickname} parent set ${rankId}`);
        res.json({ success: true, balance: user.balance });
    } catch (e) { res.status(500).send('RCON error'); }
});

app.post('/api/admin/command', async (req, res) => {
    if (req.body.nickname !== ADMIN_NICKNAME) return res.status(403).send('No');
    try {
        const response = await rcon.send(req.body.command);
        res.json({ response });
    } catch (e) { res.status(500).send('Error'); }
});

app.post('/api/admin/add-money', (req, res) => {
    if (req.body.adminNick !== ADMIN_NICKNAME) return res.status(403).send('No');
    if (data.users[req.body.targetNick]) {
        data.users[req.body.targetNick].balance += parseFloat(req.body.amount);
        save();
        res.json({ success: true });
    } else res.status(404).send('Not found');
});

// Добавляем этот эндпоинт, чтобы Render видел, что сервер живой
app.get('/', (req, res) => res.send('FableWorld API is Online!'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`SERVER RUNNING ON PORT ${PORT}`));
