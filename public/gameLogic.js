let board = null;
let game = new Chess();

// Цвета для подсветки клеток
const whiteSquareGrey = '#a9a9a9';
const blackSquareGrey = '#696969';

function removeGreySquares() {
    $('#board .square-55d63').css('background', '');
}

function greySquare(square) {
    const $square = $('#board .square-' + square);
    let background = whiteSquareGrey;
    if ($square.hasClass('black-3c85d')) {
        background = blackSquareGrey;
    }
    $square.css('background', background);
}

// Проверка загрузки DOM
$(document).ready(function () {
    console.log('DOM загружен');

    // Инициализация шахматной доски
    board = ChessBoard('board', {
        draggable: true,
        dropOffBoard: 'trash',
        sparePieces: true,
        orientation: 'white',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onMouseoverSquare: onMouseoverSquare,
        onMouseoutSquare: onMouseoutSquare,
        onSnapEnd: onSnapEnd
    });

    // Получение информации о цвете игрока
    let playerColor = null;
    socket.on('playerColor', function (color) {
        playerColor = color;
        if (playerColor === 'b') {
            board.orientation('black');
        }
    });

    // Обновление доски при получении хода с сервера
    socket.on('updateBoard', function (fen) {
        game.load(fen);
        board.position(fen);
        updateStatus();
    });
    // Обработка обновления истории ходов от сервера
    socket.on('updateHistory', function (history) {
        renderMoveHistory(history); // Обновление истории ходов на стороне клиента
    });

    // Функция для обработки начала перетаскивания фигуры
    function onDragStart(source, piece, position, orientation) {

        // Проверка, если цвет игрока не совпадает с его возможным ходом
        if ((game.turn() === 'w' && playerColor !== 'w') ||
            (game.turn() === 'b' && playerColor !== 'b')) {
            return false; // Запрет на перетаскивание
        }

        // Запрет на перетаскивание фигур другого цвета
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }

        if (game.game_over()) return false;


    }

    // Функция для обработки хода
    function onDrop(source, target) {
        removeGreySquares();

        let move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        // Если ход некорректный, вернуть фигуру на место
        if (move === null) return 'snapback';
        console.log('Ход сделан:', move);

        sendMove(move);
        updateStatus(); // Обновить статус игры
        renderMoveHistory(game.history());
    }

    function onSnapEnd() {
        board.position(game.fen());
    }

    // Обработка наведения мыши на клетку
    function onMouseoverSquare(square, piece) {
        // Проверка: если игрок — белый, подсвечивать только для белых фигур, и наоборот
        if ((playerColor === 'w' && piece && piece.search(/^b/) !== -1) ||
            (playerColor === 'b' && piece && piece.search(/^w/) !== -1)) {
            return; // Не подсвечивать клетки для фигур соперника
        }

        const moves = game.moves({
            square: square,
            verbose: true
        });

        if (moves.length === 0) return;

        greySquare(square);

        for (let i = 0; i < moves.length; i++) {
            // Проверяем, является ли ход взятием
            if (moves[i].flags.includes('c')) {
                // Подсветка для взятия может быть другой
                $('#board .square-' + moves[i].to).css('background', 'red');
            } else {
                greySquare(moves[i].to);
            }
        }
    }

    function onMouseoutSquare(square, piece) {
        removeGreySquares();
    }

    // Обновление статуса игры
    function updateStatus() {
        let status = '';
        let moveColor = game.turn() === 'w' ? 'White' : 'Black';

        // Проверка на мат
        if (game.in_checkmate()) {
            status = 'Game over, ' + moveColor + ' is in checkmate.';
        } else if (game.in_draw()) {
            status = 'Game over, drawn position';
        } else {
            status = moveColor + ' to move';
            if (game.in_check()) {
                status += ', ' + moveColor + ' is in check';
            }
        }
        console.log('Текущий статус:', status);
        $('#status').text(status);

    }

    // Отображение истории ходов
    function renderMoveHistory(moves) {
        const historyElement = $('#move-history');
        historyElement.empty();
        // Ограничиваем количество отображаемых ходов последними 10
        const start = Math.max(0, moves.length - 10);
        const recentMoves = moves.slice(start);

        const formattedMoves = [];
        for (let i = 0; i < recentMoves.length; i++) {
            const moveIndex = start + i;
            const isWhiteMove = moveIndex % 2 === 0;

            const moveColor = isWhiteMove ? 'white-move' : 'black-move';
            let currentMove = recentMoves[i];

            if (currentMove.includes('x')) {
                currentMove += ' - ВЗЯТИЕ';
            }
            if (isWhiteMove) {
                // Начало новой записи с номером хода только для белых
                formattedMoves.push(`<li class="${moveColor}">. White - ${currentMove}</li>`);
            } else {
                // Продолжение записи для черных ходов
                formattedMoves.push(`<li class="${moveColor}">. Black - ${currentMove}</li>`);
            }
        }

        historyElement.html(formattedMoves.join(''));
    }

    // Обработчик для кнопки "Начать игру"
    $('#startBtn').on('click', function () {
        console.log('Кнопка "Начать новую игру" нажата');
        $('#interface').hide();
        $('#board-container').show();
        $('#history-container').show();
        $('#status').show();

        game.reset(); // Сбросить игру
        board.position('start');
        updateStatus();
    });

    // Обработка хода от сервера
    socket.on('updateBoard', function (fen) {
        game.load(fen); // Новое состояние игры
        board.position(fen); // Обновление отображения доски
        console.log('Обновленное состояние доски:', fen);
        updateStatus();
        renderMoveHistory(game.history());
    });

    socket.emit('joinGame', 'game1');
});
