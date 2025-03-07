from app import app, db
from sqlalchemy import text
from models import Track, User
import sqlalchemy as sa
from sqlalchemy.exc import OperationalError

with app.app_context():
    with db.engine.connect() as conn:
        conn.execute(text("UPDATE tracks SET artwork = 'No Artwork' WHERE artwork IS NULL"))
        conn.execute(text("UPDATE tracks SET artwork_secondary = 'No Secondary Artwork' WHERE artwork_secondary IS NULL"))
    db.session.commit()

    # Add columns for like and unlike counts if they don't exist
    # Check if like_count column exists
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text("SELECT like_count FROM tracks LIMIT 1"))
        print("like_count column already exists")
    except OperationalError:
        # Add like_count column
        with db.engine.connect() as conn:
            conn.execute(sa.text("ALTER TABLE tracks ADD COLUMN like_count INTEGER DEFAULT 0"))
        print("Added like_count column to tracks table")
    
    # Check if unlike_count column exists
    try:
        with db.engine.connect() as conn:
            conn.execute(sa.text("SELECT unlike_count FROM tracks LIMIT 1"))
        print("unlike_count column already exists")
    except OperationalError:
        # Add unlike_count column
        with db.engine.connect() as conn:
            conn.execute(sa.text("ALTER TABLE tracks ADD COLUMN unlike_count INTEGER DEFAULT 0"))
        print("Added unlike_count column to tracks table")
    
    print("Database updated successfully!")