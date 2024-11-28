import sqlite3
import chess

DB_PATH = "chess_game.db"

def create_room_in_db(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Существует ли уже комната с таким кодом
        cursor.execute("SELECT * FROM rooms WHERE room_code = ?", (room_code,))
        initial_board_state = chess.Board().fen()
        cursor.execute("INSERT INTO game_state (room_code, board_state, game_in_progress) VALUES (?, ?, ?)",
                       (room_code, initial_board_state, False))
        if cursor.fetchone() is None:
            cursor.execute(
                "INSERT INTO rooms (room_code, game_in_progress) VALUES (?, ?)",
                (room_code, False)
            )
            conn.commit()
            print(f"Room {room_code} created successfully.")
        else:
            print(f"Room {room_code} already exists.")
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        conn.close()


def join_room_in_db(user_id, room_code, number):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Существует ли комната
        cursor.execute("SELECT player_1, player_2 FROM rooms WHERE room_code = ?", (room_code,))
        room = cursor.fetchone()

        if room is None:
            print(f"Комната {room_code} не найдена.")
            return

        player_1, player_2 = room

        if number == 1 and player_1 is None:  # Если первый слот свободен
            cursor.execute("UPDATE rooms SET player_1 = ? WHERE room_code = ?", (user_id, room_code))
            conn.commit()
            print(f"Игрок {user_id} записан в player_1 комнаты {room_code}.")

        elif number == 2 and player_2 is None:  # Если второй слот свободен
            cursor.execute("UPDATE rooms SET player_2 = ? WHERE room_code = ?", (user_id, room_code))
            conn.commit()
            print(f"Игрок {user_id} записан в player_2 комнаты {room_code}.")
        else:
            print(f"Комната {room_code} уже полна.")
        cursor.execute("SELECT player_1, player_2 FROM rooms WHERE room_code = ?", (room_code,))
        updated_room = cursor.fetchone()
        if updated_room[0] and updated_room[1]:  # Оба игрока присутствуют
            start_game_in_db(room_code)
    except sqlite3.Error as e:
        print(f"Ошибка базы данных: {e}")
    finally:
        conn.close()


def end_game_in_db(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("UPDATE game_state SET game_in_progress = ? WHERE room_code = ?", (False, room_code))
        conn.commit()
        print(f"Игра в комнате {room_code} завершена.")
    except sqlite3.Error as e:
        print(f"Ошибка базы данных: {e}")
    finally:
        conn.close()


def get_room_info(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rooms WHERE room_code = ?", (room_code,))
    room = cursor.fetchone()
    conn.close()
    return room

def get_players_in_room(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id FROM players WHERE room_code = ?", (room_code,))
        players = cursor.fetchall()
        return [player[0] for player in players]
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return []
    finally:
        conn.close()

def delete_room_from_db(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM rooms WHERE room_code = ?", (room_code,))
        conn.commit()
        print(f"Комната {room_code} удалена из базы данных.")
    except sqlite3.Error as e:
        print(f"Ошибка базы данных: {e}")
    finally:
        conn.close()



def check_rooms():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM rooms")
    rows = cursor.fetchall()

    for row in rows:
        print(row)

    conn.close()

def start_game_in_db(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT player_1, player_2 FROM rooms WHERE room_code = ?", (room_code,))
        room = cursor.fetchone()

        if room is None:
            print(f"Комната {room_code} не найдена.")
            return

        player_1, player_2 = room

        if player_1 is None or player_2 is None:
            print(f"В комнате {room_code} недостаточно игроков для начала игры.")
            return

        cursor.execute("UPDATE rooms SET game_in_progress = ? WHERE room_code = ?", (True, room_code))
        conn.commit()
        print(f"Игра в комнате {room_code} началась.")
    except sqlite3.Error as e:
        print(f"Ошибка базы данных: {e}")
    finally:
        conn.close()

def get_game_state(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT board_state, game_in_progress FROM game_state WHERE room_code = ?", (room_code,))
        game_state = cursor.fetchone()
        if game_state:
            return game_state
        return None
    except sqlite3.Error as e:
        print(f"Ошибка базы данных: {e}")
        return None
    finally:
        conn.close()

def create_new_room(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO game_state (room_code) VALUES (?)", (room_code,))
    conn.commit()
    conn.close()

def update_game_state(room_code, game_state):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE game_state SET game_state = ? WHERE room_code = ?", (game_state, room_code))
    conn.commit()
    conn.close()

def get_board_state(room_code):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT board_state FROM game_state WHERE room_code = ?", (room_code,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None