const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path')
const buildBoard = require('./boardBuilder');
const port = 3000;
const supabase = require('./database');
const seedrandom = require('seedrandom');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (if any, like CSS/JS) - implicitly needed for general web apps, though not explicitly requested, good practice.
app.use(express.static(path.join(__dirname, 'public')));

// Routes

// Dashboard / Landing Page
app.get('/', (req, res) => {
    res.render('dashboard', {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY
    });
});

// View a specific Board
app.get('/board/:id', async (req, res) => {
    const boardId = req.params.id;
    const { seed } = req.query;

    // Fetch board details to ensure it exists
    const { data: boardData, error: boardError } = await supabase
        .from('bingo_boards')
        .select('*')
        .eq('id', boardId)
        .single();

    if (boardError || !boardData) {
        console.error("Error fetching board:", boardError);
        return res.status(404).send("Board not found");
    }

    // Fetch items for this board
    const { data: itemsData, error: itemsError } = await supabase
        .from('bingo_items')
        .select('text')
        .eq('board_id', boardId);

    if (itemsError) {
        console.error("Error fetching items:", itemsError);
        return res.status(500).send("Database Error");
    }

    // Determine seed: use query param or generate random string
    const currentSeed = seed || Math.random().toString(36).substring(7);
    const rng = seedrandom(currentSeed);
    
    // Shuffle items with seeded RNG (Fisher-Yates)
    const items = itemsData.map(r => ({ text: r.text, selected: false }));
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    
    const board = buildBoard(items);
    res.render('board', { 
        board: board, 
        seed: currentSeed, 
        boardTitle: boardData.title, 
        boardId: boardId,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY
    });
});

// API Routes

// Get all boards for a user (This might need Auth context, currently just verifying frontend sends token or we handle it client-side)
// Actually, with Supabase, client-side requests are often easier for "my stuff", but since we are serving Views, we might want an API for the dashboard to fetch lists.
// Let's assume the dashboard will fetch via client-side Supabase for auth simplicity, OR we proxy.
// For now, let's keep the backend simple and maybe just helper APIs.

// Create a new board
app.post('/api/boards', async (req, res) => {
    const { title, user_id } = req.body; // In real app, get user_id from verified token
    if (!title || !user_id) return res.status(400).json({ error: "Title and User ID required" });

    const { data, error } = await supabase
        .from('bingo_boards')
        .insert([{ title, user_id }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get items for a board (Editor interface)
app.get('/api/boards/:id/items', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('bingo_items')
        .select('*')
        .eq('board_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Add item to board
app.post('/api/boards/:id/items', async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text) return res.status(400).json({ error: "Text is required" });

    const { data, error } = await supabase
        .from('bingo_items')
        .insert([{ board_id: id, text }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Update item
app.put('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    const { data, error } = await supabase
        .from('bingo_items')
        .update({ text })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('bingo_items')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Deleted" });
});


// Socket.io logic
// Note: We need to handle rooms now so interactions on one board don't affect others!
// Room ID = Board ID
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('joinBoard', (boardId) => {
        socket.join(boardId);
        console.log(`User joined board room: ${boardId}`);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('toggleCellFromBrowser', function (id, status, boardId) {
        console.log('toggleCellFromBrowser', id, status, boardId);
        // Broadcast only to that board's room
        io.to(boardId).emit('toggleCellFromBackend', id, status);
    });
});

server.listen(port, () => {
  console.log(`Bingo App listening on port ${port}`);
});
