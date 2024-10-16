from telegram import Update
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
import chess
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

# Инициализируем шахматную доску
board = chess.Board()

# Команда /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        [InlineKeyboardButton("Играть", web_app=WebAppInfo(url="https://maximfurzikovv.github.io/web_app_bot/"))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text('Нажми на кнопку ниже, чтобы начать играть:', reply_markup=reply_markup)


def main() -> None:
    application = ApplicationBuilder().token("7349994218:AAH4_eqS0g3dVQUNLwSY579NS4uqs8hzn0M").build()

    application.add_handler(CommandHandler("start", start))
   
    # Запуск бота
    application.run_polling()

if __name__ == '__main__':
    main()