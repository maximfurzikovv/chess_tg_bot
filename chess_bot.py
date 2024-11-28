import logging
from telegram import Update
from telegram import ReplyKeyboardMarkup, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
import chess
from dotenv import load_dotenv
import os
from DB import create_room_in_db, join_room_in_db, end_game_in_db, get_room_info, get_players_in_room
import random
import string

DB_PATH = "chess_game.db"

game_in_progress = {}
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)
WEB_APP_URL = "https://0d90-91-216-66-229.ngrok-free.app"
load_dotenv()

# Шахматная доска
board = chess.Board()
rooms = {}

# Команда /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        ["Создать комнату"],
        ["Подключиться к комнате"]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
    await update.message.reply_text("Выберите действие:", reply_markup=reply_markup)

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# Создание комнаты
async def create_room(update, context):
    user_id = update.message.from_user.id
    room_code = generate_room_code()

    # Сохранение в базу данных
    create_room_in_db(room_code)
    # Присваиваие комнаты текущему пользователю
    join_room_in_db(user_id, room_code)

    unique_url = f"{WEB_APP_URL}/room/{room_code}"
    await update.message.reply_text(f"Комната с кодом {room_code} создана!")
    join_room_in_db(user_id, room_code)
    keyboard = [
        [InlineKeyboardButton("Открыть шахматы", web_app=WebAppInfo(url=f"{WEB_APP_URL}/webapp"))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(f"Нажмите для начала игры в шахматы!", reply_markup=reply_markup)


# Подключение к комнате
async def join_room(update, context):
    await update.message.reply_text("Введите код комнаты, чтобы подключиться:")


# Обработка кода комнаты
async def handle_room_code(update, context):
    user_id = update.message.from_user.id
    room_code = update.message.text.strip()

    room = get_room_info(room_code)
    if room:
        players = get_players_in_room(room_code)
        if len(players) < 2:
            join_room_in_db(user_id, room_code)
            await update.message.reply_text(f"Вы подключились к комнате {room_code}!")
            keyboard = [
                [InlineKeyboardButton("Открыть шахматы", web_app=WebAppInfo(url=f"{WEB_APP_URL}/webapp"))]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(f"Нажмите для начала игры в шахматы!", reply_markup=reply_markup)
        else:
            await update.message.reply_text(f"Комната {room_code} уже полна.")
    else:
        await update.message.reply_text(f"Комната с кодом {room_code} не найдена.")

# Завершение игры и сброс состояния
async def end_game(update, context):
    user_id = update.message.from_user.id
    for room_code, room in rooms.items():
        if user_id in room['players']:
            end_game_in_db(room_code)
            await update.message.reply_text(f"Игра в комнате {room_code} завершена. Вы покинули комнату.")
            break

    keyboard = [
        ["Создать комнату"],
        ["Подключиться к комнате"]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
    await update.message.reply_text("Выберите действие:", reply_markup=reply_markup)


# Обработка команд
async def create_or_join_room(update, context):
    text = update.message.text.lower()
    if text == "создать комнату":
        await create_room(update, context)
    elif text == "подключиться к комнате":
        await join_room(update, context)
    elif len(text) == 6 and text.isalnum():
        await handle_room_code(update, context)
    elif text == "открыть шахматы":
        await update.message.reply_text("Для игры перейдите по ссылке выше.")
    else:
        await update.message.reply_text("Некорректное действие. Попробуйте снова.")


# Основная функция
def main() -> None:
    token = os.getenv("TELEGRAM_TOKEN")

    application = ApplicationBuilder().token(token).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", end_game))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, create_or_join_room))
    application.add_handler(MessageHandler(filters.TEXT & filters.COMMAND, end_game))

    # Запуск бота
    application.run_polling()


if __name__ == '__main__':
    main()
