const express = require('express');
const http = require('http');
const socket = require('socket.io');
const path = require('path');
const Chess = require('chess.js').Chess;

const app = express();
const server = http.createServer(app);
const io = socket(server);

const PORT = process.env.PORT || 3000;

// Словарь для хранения активных игр
let games = {};
app.use(express.static(path.join(__dirname, 'public')));
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
            games[gameId].game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        }

        // Добавляем игрока в игру
        const game = games[gameId];

        // Проверка, если игрок уже присоединился
        if (game.players.includes(socket.id)) {
            console.log('Этот игрок уже присоединился к игре.');
            return;
        }

        // Присваивание игроку цвета в зависимости от порядка подключения
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
        if (game) {
            // Обновление состояния игры
            const chessMove = game.game.move(move);
            if (chessMove === null) {
                console.log('Ошибка: Невалидный ход:', move);
                return;
            }

            io.to(gameId).emit('updateBoard', game.game.fen()); // Отправка новое состояние игры
            console.log('Новое состояние доски отправлено:', game.game.fen());
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
});

app.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
