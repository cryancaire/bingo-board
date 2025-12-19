const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path')
const buildBoard = require('./boardBuilder');
const port = 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const bingoItems = [
    { text: "Double Jump", selected: false },
    { text: "Ice Level", selected: false },
    { text: "Escort Mission", selected: false },
    { text: "Boss Phase 2", selected: false },
    { text: "Health Potion", selected: true }, // Example selected item
    { text: "Tutorial", selected: false },
    { text: "Unskippable Cutscene", selected: false },
    { text: "Fetch Quest", selected: false },
    { text: "Silent Protagonist", selected: false },
    { text: "QTE", selected: false },
    { text: "Water Level", selected: false },
    { text: "Exploding Barrel", selected: false },
    { text: "Hidden Wall", selected: false },
    { text: "Save Point", selected: false },
    { text: "New Game+", selected: false },
    { text: "Long Credits", selected: false },
    { text: "Loot Box", selected: false },
    { text: "XP Grind", selected: false },
    { text: "Skill Tree", selected: false },
    { text: "NPC Blocking Path", selected: false },
    { text: "Respawning Enemies", selected: false },
    { text: "Fast Travel", selected: false },
    { text: "Game Over", selected: false },
    { text: "Victory Fanfare", selected: false }
];
const board = buildBoard(bingoItems);

app.get('/', (req, res) => {
    res.render('board', { board: board });
});

app.get('/toggleCell/:id', (req, res) => {
    const { id } = req.params;
    io.emit('toggleCell', id);
    res.json({ id });
});

app.get('/selectCell/:id', (req, res) => {
    const { id } = req.params;
    io.emit('selectCell', id);
    res.json({ id });
});

app.get('/resetBoard', (req, res) => {
    io.emit('resetBoard');
    res.json({ message : "resetBoard"});
});

app.get('/toggleVisibility', (req, res) => {
    io.emit('toggleVisibility');
    res.json({ message : "toggleVisibility"});
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('toggleCellFromBrowser', function (id, status) {
        console.log('toggleCellFromBrowser', id, status);
        io.emit('toggleCellFromBackend', id, status);
    });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
