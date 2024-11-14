var board = null;
let game = new Chess();

// Цвета для подсветки клеток
var whiteSquareGrey = '#a9a9a9';
var blackSquareGrey = '#696969';

function removeGreySquares() {
    $('#board .square-55d63').css('background', '');
}

function greySquare(square) {
    var $square = $('#board .square-' + square);
    var background = whiteSquareGrey;
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

    // let playerColor = null;
    // socket.on('playerColor', function (color) {
    //     playerColor = color;
    //     if (playerColor === 'b') {
    //         board.orientation('black');
    //     }
    // });
    // Обновление доски при получении хода с сервера
    socket.on('updateBoard', function (fen) {
        game.load(fen);
        board.position(fen);
        updateStatus();
    });
    // Функция для обработки начала перетаскивания фигуры
    function onDragStart(source, piece, position, orientation) {

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

        var moves = game.moves({
            square: square,
            verbose: true
        });

        if (moves.length === 0) return;

        greySquare(square);

        for (var i = 0; i < moves.length; i++) {
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
        var historyElement = $('#move-history');
        historyElement.empty();

        var movesText = '';
        var formattedMoves = [];

        for (var i = 0; i < moves.length; i++) {
            var moveColor = (i % 2 === 0) ? 'white-move' : 'black-move';
            var currentMove = moves[i];

            if (currentMove.includes('x')) {
                currentMove += ' - ВЗЯТИЕ';
            }

            formattedMoves.push('<li class="' + moveColor + '">');
            if (i % 2 === 0) {
                formattedMoves.push('White - ' + currentMove);
            } else {
                formattedMoves.push('Black - ' + currentMove);
            }
            formattedMoves.push('</li>');
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
    });

    socket.emit('joinGame', 'game1');
});
