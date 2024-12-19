from app import app, db
from sqlalchemy import text

with app.app_context():
    with db.engine.connect() as conn:
        conn.execute(text("UPDATE tracks SET artwork = 'No Artwork' WHERE artwork IS NULL"))
        conn.execute(text("UPDATE tracks SET artwork_secondary = 'No Secondary Artwork' WHERE artwork_secondary IS NULL"))
    db.session.commit()