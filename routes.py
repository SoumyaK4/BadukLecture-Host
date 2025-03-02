from flask import render_template, redirect, url_for, request, jsonify, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import User, Lecture, Topic, Tag, Rank
from forms import LoginForm, LectureForm, MetadataForm
from utils import get_youtube_video_info
import logging

@app.route('/')
def home():
    lectures = Lecture.query.order_by(Lecture.publish_date.desc()).limit(6).all()
    return render_template('home.html', lectures=lectures)

@app.route('/search')
def search():
    return render_template('search.html')

@app.route('/api/search')
def api_search():
    query = request.args.get('q', '')
    topic_ids = request.args.getlist('topics[]')
    tag_ids = request.args.getlist('tags[]')
    rank_id = request.args.get('rank')
    sort_by = request.args.get('sort', 'date')

    lectures_query = Lecture.query

    if query:
        lectures_query = lectures_query.filter(Lecture.title.ilike(f'%{query}%'))

    if topic_ids:
        for topic_id in topic_ids:
            lectures_query = lectures_query.filter(Lecture.topics.any(Topic.id == topic_id))

    if tag_ids:
        for tag_id in tag_ids:
            lectures_query = lectures_query.filter(Lecture.tags.any(Tag.id == tag_id))

    if rank_id:
        lectures_query = lectures_query.filter_by(rank_id=rank_id)

    if sort_by == 'date':
        lectures_query = lectures_query.order_by(Lecture.publish_date.desc())
    elif sort_by == 'rank':
        lectures_query = lectures_query.order_by(Lecture.rank_id)

    lectures = lectures_query.all()
    return jsonify([{
        'id': l.id,
        'title': l.title,
        'youtube_id': l.youtube_id,
        'thumbnail_url': l.thumbnail_url,
        'topics': [t.name for t in l.topics],
        'tags': [t.name for t in l.tags],
        'rank': l.rank.name if l.rank else None
    } for l in lectures])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user)
            return redirect(url_for('home'))
        flash('Invalid username or password')
    return render_template('admin/login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

@app.route('/admin/lecture/add', methods=['GET', 'POST'])
@login_required
def add_lecture():
    form = LectureForm()
    form.topics.choices = [(t.id, t.name) for t in Topic.query.all()]
    form.tags.choices = [(t.id, t.name) for t in Tag.query.all()]
    form.rank.choices = [(r.id, r.name) for r in Rank.query.all()]

    if form.validate_on_submit():
        try:
            video_info = get_youtube_video_info(form.youtube_url.data)
            lecture = Lecture(
                title=form.title.data,
                youtube_id=video_info['youtube_id'],
                thumbnail_url=video_info['thumbnail_url'],
                publish_date=video_info['publish_date']
            )
            
            selected_topics = Topic.query.filter(Topic.id.in_(form.topics.data)).all()
            selected_tags = Tag.query.filter(Tag.id.in_(form.tags.data)).all()
            selected_rank = Rank.query.filter(Rank.id.in_(form.rank.data)).first()

            lecture.topics = selected_topics
            lecture.tags = selected_tags
            lecture.rank_id = selected_rank.id if selected_rank else None

            db.session.add(lecture)
            db.session.commit()
            flash('Lecture added successfully!')
            return redirect(url_for('home'))
        except Exception as e:
            logging.error(f"Error adding lecture: {str(e)}")
            flash('Error adding lecture. Please check the YouTube URL.')

    return render_template('admin/add_lecture.html', form=form)

@app.route('/admin/metadata', methods=['GET', 'POST'])
@login_required
def manage_metadata():
    topic_form = MetadataForm(prefix="topic")
    tag_form = MetadataForm(prefix="tag")
    rank_form = MetadataForm(prefix="rank")

    if request.method == 'POST':
        if 'add_topic' in request.form and topic_form.validate():
            topic = Topic(name=topic_form.name.data)
            db.session.add(topic)
            db.session.commit()
        elif 'add_tag' in request.form and tag_form.validate():
            tag = Tag(name=tag_form.name.data)
            db.session.add(tag)
            db.session.commit()
        elif 'add_rank' in request.form and rank_form.validate():
            rank = Rank(name=rank_form.name.data)
            db.session.add(rank)
            db.session.commit()

    topics = Topic.query.all()
    tags = Tag.query.all()
    ranks = Rank.query.all()

    return render_template('admin/manage_metadata.html',
                         topic_form=topic_form,
                         tag_form=tag_form,
                         rank_form=rank_form,
                         topics=topics,
                         tags=tags,
                         ranks=ranks)
