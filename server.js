const express = require('express');
const cors = require('cors');
const { Rcon } = require('rcon-client');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_NICKNAME = 'WorldMod'; 
const DATA_FILE = './database.json';

// --- ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ---
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, promoCodes: {} }));
}

let data = { users: {}, promoCodes: {} };
try {
    data = JSON.parse(fs.readFileSync(DATA_FILE));
} catch (e) {
    console.error("Ошибка чтения базы, создаю чистую.");
}

const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// --- НАСТРОЙКА RCON ---
const rcon = new Rcon({
    host: '45.131.109.151',
    port: 25575,
    password: 'ТВОЙ_ПАРОЛЬ' 
});

// Безопасная функция отправки команд
async function sendCommand(cmd) {
    try {
        if (!rcon.connected) await rcon.connect();
        return await rcon.send(cmd);
    } catch (e) {
        console.error("RCON Error:", e.message);
        return "Ошибка: сервер Minecraft недоступен";
    }
}

// --- ЭНДПОИНТЫ ---

// Главная (чтобы Render видел, что сервер жив)
app.get('/', (req, res) => res.send('<h1>FableWorld API is Online!</h1>'));

// Авторизация
app.post('/api/auth', (req, res) => {
    const { nickname } = req.body;
    if (!nickname) return res.status(400).json({ error: 'Ник не указан' });
    if (!data.users[nickname]) {
        data.users[nickname] = { nickname, balance: 0 };
        save();
    }
    res.json(data.users[nickname]);
});

// Покупка
app.post('/api/buy', async (req, res) => {
    const { nickname, rankId, price } = req.body;
    const user = data.users[nickname];

    if (!user || user.balance < price) {
        return res.status(400).json({ error: 'Недостаточно Fables' });
    }

    user.balance -= price;
    save();

    let command = "";
    if (rankId === 'case_donate') command = `crate give ${nickname} Fables 1`;
    else if (rankId === 'unban') command = `pardon ${nickname}`;
    else command = `lp user ${nickname} parent set ${rankId}`;

    const response = await sendCommand(command);
    res.json({ success: true, balance: user.balance, serverResponse: response });
});

// Админка: Консоль
app.post('/api/admin/command', async (req, res) => {
    const { nickname, command } = req.body;
    if (nickname !== ADMIN_NICKNAME) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const response = await sendCommand(command);
    res.json({ response });
});

// Админка: Выдача денег
app.post('/api/admin/add-money', (req, res) => {
    const { adminNick, targetNick, amount } = req.body;
    if (adminNick !== ADMIN_NICKNAME) return res.status(403).json({ error: 'Доступ запрещен' });

    if (data.users[targetNick]) {
        data.users[targetNick].balance += parseFloat(amount);
        save();
        res.json({ success: true, newBalance: data.users[targetNick].balance });
    } else {
        res.status(404).json({ error: 'Игрок не найден' });
    }
});

// --- ЗАПУСК ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
    console.log(`ADMIN NICKNAME: ${ADMIN_NICKNAME}`);
    console.log(`=================================`);
});
