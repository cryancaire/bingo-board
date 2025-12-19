/**
 * Builds a 5x5 bingo board from a list of items.
 * The center square (2,2) is always "Free".
 * 
 * @param {Array} items - Array of items to fill the board. Needs at least 24 items.
 * @returns {Array<Array<string>>} - 5x5 matrix representing the board.
 */
function buildBoard(items) {
    const size = 5;
    const board = [];
    let itemIndex = 0;

    for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) {
            const id = `r${r}-c${c}`;
            if (r === 2 && c === 2) {
                row.push({ id, text: "Free" });
            } else {
                // Use provided item or fallback if we run out
                const text = items && items[itemIndex] ? items[itemIndex] : `Square ${itemIndex + 1}`;
                row.push({ id, text });
                itemIndex++;
            }
        }
        board.push(row);
    }
    return board;
}

module.exports = buildBoard;
