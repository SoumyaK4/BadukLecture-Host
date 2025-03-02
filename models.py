from datetime import datetime
from app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Lecture(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    youtube_id = db.Column(db.String(20), unique=True, nullable=False)
    thumbnail_url = db.Column(db.String(200))
    publish_date = db.Column(db.DateTime, default=datetime.utcnow)
    rank_id = db.Column(db.Integer, db.ForeignKey('rank.id'))
    
    # Relationships
    topics = db.relationship('Topic', secondary='lecture_topic')
    tags = db.relationship('Tag', secondary='lecture_tag')
    rank = db.relationship('Rank', backref='lectures')

class Topic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class Rank(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), unique=True, nullable=False)

# Association tables
lecture_topic = db.Table('lecture_topic',
    db.Column('lecture_id', db.Integer, db.ForeignKey('lecture.id')),
    db.Column('topic_id', db.Integer, db.ForeignKey('topic.id'))
)

lecture_tag = db.Table('lecture_tag',
    db.Column('lecture_id', db.Integer, db.ForeignKey('lecture.id')),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'))
)
