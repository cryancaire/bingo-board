function updateBoard(id) {
    const cell = document.getElementById(id);
    cell.classList.toggle('selected');
}

module.exports = updateBoard;
