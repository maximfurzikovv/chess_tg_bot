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


app.use(express.static(path.join(__dirname, 'public')));

// app.get('/room/:roomCode', (req, res) => {
//     const roomCode = req.params.roomCode;
//
//     // Получение информации о комнате из базы данных
//     getRoomByCode(roomCode, (room) => {
//         if (room) {
//             console.log(`Комната найдена: ${room.room_code}`);
//             res.sendFile(path.join(__dirname, 'public', 'index.html'));
//         } else {
//             console.log(`Комната не найдена: ${roomCode}`);
//             res.status(404).send('Комната не найдена');
//         }
//     });
// });
app.get('/webapp', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Функция для получения информации о комнате из базы данных
function getRoomByCode(roomCode, callback) {
    const db = new sqlite3.Database('database/chess_game.db');

    db.get('SELECT * FROM rooms WHERE room_code = ?', [roomCode], (err, row) => {
        if (err) {
            console.error('Ошибка при получении данных:', err);
            callback(null);
        } else {
            callback(row);
        }
    });

    db.close();
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
            games[gameId].game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        }

        // Добавляем игрока в игру
        const game = games[gameId];

        // Проверка, если игрок уже присоединился
        if (game.players.includes(socket.id)) {
            console.log('Этот игрок уже присоединился к игре.');
            return;
        }
        // if (game.players.length === 2) {
        //     socket.emit('error', 'Эта игра уже заполнена.');
        //     return;
        // }
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
        console.log('Received move:', move);
        if (game) {
            try {
                const chessMove = game.game.move(move);
                if (chessMove === null) {
                    console.log('Ошибка: Невалидный ход:', move);
                    return;
                }

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
});


server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
