from sqlalchemy import create_engine, Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import relationship
import chess

Base = declarative_base()

# Модели для базы данных
class Room(Base):
    __tablename__ = 'rooms'
    room_code = Column(String, primary_key=True)
    player_1 = Column(Integer, nullable=True)
    player_2 = Column(Integer, nullable=True)


class GameState(Base):
    __tablename__ = 'game_state'
    game_code = Column(String, primary_key=True)
    board_state = Column(String, nullable=False)
    game_in_progress = Column(Boolean, default=False)
    id_room_code = Column(String, ForeignKey('rooms.room_code'), nullable=False)
    # Связь с таблицей Room
    room = relationship("Room", backref="game_states")


# Настройка подключения к базе данных
DATABASE_URL = "sqlite:///chess_game.db"
engine = create_engine(DATABASE_URL, echo=True)

Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)
session = Session()


def create_room_in_db(room_code):
    room = Room(room_code=room_code)

    # Проверка, существует ли уже комната с таким кодом
    existing_room = session.query(Room).filter_by(room_code=room_code).first()
    if existing_room:
        print(f"Комната {room_code} уже существует.")
        return

    session.add(room)
    session.commit()
    print(f"Комната {room_code} создана.")


def join_room_in_db(user_id, room_code, number):
    room = session.query(Room).filter_by(room_code=room_code).first()
    if not room:
        print(f"Комната с кодом {room_code} не найдена.")
        return

        # Проверка, что игрок не записался в обе ячейки
    if room.player_1 == user_id or room.player_2 == user_id:
        print(f"Игрок {user_id} уже присоединился к комнате {room_code}.")
        return

    if number == 1 and room.player_1 is None:
        room.player_1 = user_id
    elif number == 2 and room.player_2 is None:
        room.player_2 = user_id
    else:
        print(f"Комната {room_code} уже полна.")
        return

    session.commit()
    print(f"Игрок {user_id} подключился к комнате {room_code} как player_{number}.")

    # Проверка, если оба игрока присоединились, то начинаем игру
    if room.player_1 is not None and room.player_2 is not None:
        start_game_in_db(room_code)


def start_game_in_db(room_code):
    room = session.query(Room).filter_by(room_code=room_code).first()
    if room:
        room.game_in_progress = True
        session.commit()
        print(f"Игра в комнате {room_code} началась.")


def end_game_in_db(room_code):
    game_state = session.query(GameState).filter_by(room_code=room_code).first()
    if game_state:
        game_state.game_in_progress = False
        session.commit()
        print(f"Игра в комнате {room_code} завершена.")


def get_room_info(room_code):
    return session.query(Room).filter_by(room_code=room_code).first()


def get_players_in_room(room_code):
    room = session.query(Room).filter_by(room_code=room_code).first()
    if room:
        return [room.player_1, room.player_2]
    return []
