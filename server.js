const express = require('express');
const { Rcon } = require('rcon-client');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Раздает index.html игрокам

// ТВОИ ДАННЫЕ FALIX
const rconConfig = {
    host: "fableworld.falix.gg",
    port: 25575, 
    password: "232013"
};

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка покупок
app.post('/api/buy', async (req, res) => {
    const { nickname, rankId } = req.body;
    console.log(`Покупка: ${nickname} -> ${rankId}`);

    try {
        const rcon = await Rcon.connect(rconConfig);
        
        let command = `lp user ${nickname} parent set ${rankId}`;
        if (rankId.includes('case')) command = `crate give to ${nickname} ${rankId} 1`;
        if (rankId === 'unban') command = `pardon ${nickname}`;
        if (rankId === 'unmute') command = `unmute ${nickname}`;

        const response = await rcon.send(command);
        await rcon.end();
        res.json({ success: true, message: response });
    } catch (err) {
        console.error("RCON Error:", err.message);
        res.status(500).json({ success: false, error: "Сервер Minecraft недоступен" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FableWorld работает на порту ${PORT}`));
