import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from sqlalchemy.orm import DeclarativeBase

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///baduk_lectures.db")


@app.cli.command("db_update")
def db_update():
    """Update database tables."""
    with app.app_context():
        db.create_all()
        print("Database tables updated successfully!")

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["YOUTUBE_API_KEY"] = os.environ.get("YOUTUBE_API_KEY", "your-api-key")

# Initialize extensions
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'login'

with app.app_context():
    import models
    import routes
    db.create_all()
