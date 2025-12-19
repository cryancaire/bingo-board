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
    "Double Jump", "Ice Level", "Escort Mission", "Boss Phase 2",
    "Health Potion", "Tutorial", "Unskippable Cutscene", "Fetch Quest",
    "Silent Protagonist", "QTE", "Water Level", "Exploding Barrel",
    "Hidden Wall", "Save Point", "New Game+", "Long Credits",
    "Loot Box", "XP Grind", "Skill Tree", "NPC Blocking Path",
    "Respawning Enemies", "Fast Travel", "Game Over", "Victory Fanfare"
];
const board = buildBoard(bingoItems);

app.get('/', (req, res) => {
    // Dummy data for the board (24 items needed)
    
    
    res.render('board', { board: board });
});

app.get('/toggleCell/:id', (req, res) => {
    const { id } = req.params;
    io.emit('toggleCell', id);
    res.json({ id });
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
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
