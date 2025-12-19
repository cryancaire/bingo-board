const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path')
const buildBoard = require('./boardBuilder');
const port = 3000;
const db = require('./database');
const seedrandom = require('seedrandom');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Initialization and Seeding
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT)");
    
    db.get("SELECT count(*) as count FROM items", (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            console.log("Seeding database with initial items...");
            const stmt = db.prepare("INSERT INTO items (text) VALUES (?)");
            const bingoItems = [
                "Double Jump", "Ice Level", "Escort Mission", "Boss Phase 2", "Health Potion",
                "Tutorial", "Unskippable Cutscene", "Fetch Quest", "Silent Protagonist", "QTE",
                "Water Level", "Exploding Barrel", "Hidden Wall", "Save Point", "New Game+",
                "Long Credits", "Loot Box", "XP Grind", "Skill Tree", "NPC Blocking Path",
                "Respawning Enemies", "Fast Travel", "Game Over", "Victory Fanfare"
            ];
            bingoItems.forEach(text => stmt.run(text));
            stmt.finalize();
        }
    });
});

// Routes
app.get('/', (req, res) => {
    // Fetch ALL items, then shuffle in JS using seed
    db.all("SELECT text FROM items", (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database Error");
        }
        
        // Determine seed: use query param or generate random string
        const seed = req.query.seed || Math.random().toString(36).substring(7);
        const rng = seedrandom(seed);
        
        // Shuffle items with seeded RNG (Fisher-Yates)
        const items = rows.map(r => ({ text: r.text, selected: false }));
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        
        const board = buildBoard(items);
        res.render('board', { board: board, seed: seed });
    });
});

app.get('/admin', (req, res) => {
    res.render('admin');
});

// API Routes
app.get('/api/items', (req, res) => {
    db.all("SELECT * FROM items", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/items', (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });
    
    db.run("INSERT INTO items (text) VALUES (?)", [text], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, text });
        // Optionally emit event if we want live updates
    });
});

app.put('/api/items/:id', (req, res) => {
    const { text } = req.body;
    const { id } = req.params;
    
    db.run("UPDATE items SET text = ? WHERE id = ?", [text, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

app.delete('/api/items/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM items WHERE id = ?", id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// Socket.io logic (Note: cell toggling is global! Seeded boards share the same socket namespace currently, 
// so clicking a cell updates ALL connected clients even if they have different boards. 
// This is likely unintended behavior for a multi-room setup, but for this specific request 
// we are only handling generation. I will leave socket logic as-is unless requested otherwise.)
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
