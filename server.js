const express = require('express');
const http = require('http');
const socket = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const Chess = require('chess.js').Chess;

const app = express();
const server = http.createServer(app);
const io = socket(server);

const PORT = process.env.PORT || 3000;

// Подключение к базе данных
const db = new sqlite3.Database('chess_game.db');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/webapp?roomCode', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function getGameState(gameId, callback) {
    db.get('SELECT board_state FROM game_state WHERE room_code = ?', [gameId], (err, row) => {
        if (err) {
            console.error('Ошибка при извлечении состояния игры:', err);
            callback(null);
        } else {
            callback(row ? row.board_state : null);
        }
    });
}

function updateGameState(gameId, boardState) {
    db.run(
        'UPDATE game_state SET board_state = ?, game_in_progress = ? WHERE room_code = ?',
        [boardState, 1, gameId],
        (err) => {
            if (err) console.error('Ошибка при обновлении состояния игры:', err);

            else console.log('Состояние игры обновлено в базе данных.');
        }
    );
}

const games = {};

io.on('connection', (socket) => {
    console.log('Новый игрок подключен:', socket.id);

    // Обработка события подключения к игре
    socket.on('joinGame', (gameId) => {
        if (!games[gameId]) {
            games[gameId] = {
                players: [],
                game: new Chess(),
                boardState: null,
                playerColors: {}
            };
            // Получение информации о комнате из базы данных
            getGameState(gameId, (boardState) => {
                if (boardState) {
                    console.log(`Комната с кодом ${gameId} найдена. Состояние доски загружено.`);
                    const game = games[gameId] || {game: new Chess()};
                    game.boardState = boardState;
                    game.game.load(game.boardState);

                    io.to(gameId).emit('updateBoard', game.game.fen());
                } else {
                    console.log(`Комната с кодом ${gameId} не найдена. Создаем новую игру.`);
                    const newGame = new Chess();
                    games[gameId] = {
                        players: [],
                        game: newGame,
                        boardState: newGame.fen(),
                        playerColors: {}
                    };

                    io.to(gameId).emit('updateBoard', newGame.fen());
                }
            });
        }

        const game = games[gameId];

        if (game.players.includes(socket.id)) {
            console.log('Этот игрок уже присоединился к игре.');
            return;
        }

        if (game.players.length === 0) {
            game.playerColors[socket.id] = 'w';
            game.players.push(socket.id);
            socket.join(gameId);
            socket.emit('playerColor', 'w'); // Отправка информации о цвете
            console.log(`Игрок ${socket.id} присоединился к игре ${gameId} за белых.`);
        } else if (game.players.length === 1) {
            game.playerColors[socket.id] = 'b';
            game.players.push(socket.id);
            socket.join(gameId);
            socket.emit('playerColor', 'b'); // Отправка информации о цвете
            console.log(`Игрок ${socket.id} присоединился к игре ${gameId} за черных.`);
        }

        io.to(gameId).emit('updateBoard', game.game.fen());
    });

    socket.on('move', ({gameId, move}) => {
        const game = games[gameId];

        console.log('Received move:', move);
        if (game) {
            try {
                const chessMove = game.game.move(move);
                if (chessMove === null) {
                    console.log('Ошибка: Невалидный ход:', move);
                    return;
                }

                const boardState = game.game.fen();
                updateGameState(gameId, game.game.fen());

                io.to(gameId).emit('updateBoard', game.game.fen());
                io.to(gameId).emit('updateHistory', game.game.history());

                console.log('Новое состояние доски отправлено:', game.game.fen());
            } catch (error) {
                console.error('Ошибка при выполнении хода:', error);
            }
        }
    });


// Обработка обновления состояния доски
    socket.on('updateBoard', function (fen) {
        game.load(fen); // Новое состояние игры
        board.position(fen); // Обновление отображения доски
        updateStatus(); // Обновление статусв игры
    });

// Обработка отключения игрока
    socket.on('disconnect', () => {
        console.log('Игрок отключен:', socket.id);
        Object.keys(games).forEach(gameId => {
            const game = games[gameId];
            if (game.players.includes(socket.id)) {
                game.players = game.players.filter(id => id !== socket.id);
                delete game.playerColors[socket.id];
            }
        });
    });
})
;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
