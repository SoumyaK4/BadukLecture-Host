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
    topics = Topic.query.all()
    tags = Tag.query.all()
    ranks = Rank.query.all()
    return render_template('search.html', topics=topics, tags=tags, ranks=ranks)

@app.route('/api/search')
def api_search():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = 12
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
                if topic_id:  # Skip empty topic IDs
                    lectures_query = lectures_query.filter(Lecture.topics.any(Topic.id == topic_id))

        if tag_ids:
            for tag_id in tag_ids:
                if tag_id:  # Skip empty tag IDs
                    lectures_query = lectures_query.filter(Lecture.tags.any(Tag.id == tag_id))

        if rank_id:
            lectures_query = lectures_query.filter_by(rank_id=rank_id)

        if sort_by == 'date':
            lectures_query = lectures_query.order_by(Lecture.publish_date.desc())
        elif sort_by == 'rank':
            lectures_query = lectures_query.order_by(Lecture.rank_id)

        # Add pagination
        pagination = lectures_query.paginate(page=page, per_page=per_page, error_out=False)
        lectures = pagination.items

        lecture_data = []
        for l in lectures:
            rank_name = None
            if l.rank_id:
                rank = Rank.query.get(l.rank_id)
                rank_name = rank.name if rank else None
                
            lecture_data.append({
                'id': l.id,
                'title': l.title,
                'youtube_id': l.youtube_id,
                'thumbnail_url': l.thumbnail_url,
                'publish_date': l.publish_date.isoformat(),
                'topics': [t.name for t in l.topics],
                'tags': [t.name for t in l.tags],
                'rank': rank_name
            })
            
        return jsonify({
            'lectures': lecture_data,
            'has_next': pagination.has_next,
            'total_pages': pagination.pages,
            'current_page': pagination.page
        })
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logging.error(f"Error in api_search: {str(e)}\n{error_details}")
        return jsonify({'error': str(e)}), 500

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

@app.route('/admin/lecture/edit/<int:lecture_id>', methods=['GET', 'POST'])
@login_required
def edit_lecture(lecture_id):
    lecture = Lecture.query.get_or_404(lecture_id)
    form = LectureForm()
    form.topics.choices = [(t.id, t.name) for t in Topic.query.all()]
    form.tags.choices = [(t.id, t.name) for t in Tag.query.all()]
    form.rank.choices = [(r.id, r.name) for r in Rank.query.all()]

    if form.validate_on_submit():
        try:
            # Update basic info
            lecture.title = form.title.data

            # Only update YouTube info if URL changed
            if form.youtube_url.data != f"https://youtu.be/{lecture.youtube_id}":
                video_info = get_youtube_video_info(form.youtube_url.data)
                lecture.youtube_id = video_info['youtube_id']
                lecture.thumbnail_url = video_info['thumbnail_url']
                lecture.publish_date = video_info['publish_date']

            # Update relationships
            selected_topics = Topic.query.filter(Topic.id.in_(form.topics.data)).all()
            selected_tags = Tag.query.filter(Tag.id.in_(form.tags.data)).all()
            selected_rank = Rank.query.filter(Rank.id.in_(form.rank.data)).first()

            lecture.topics = selected_topics
            lecture.tags = selected_tags
            lecture.rank_id = selected_rank.id if selected_rank else None

            db.session.commit()
            flash('Lecture updated successfully!')
            return redirect(url_for('home'))
        except Exception as e:
            logging.error(f"Error updating lecture: {str(e)}")
            flash('Error updating lecture. Please check the form data.')

    elif request.method == 'GET':
        form.title.data = lecture.title
        form.youtube_url.data = f"https://youtu.be/{lecture.youtube_id}"
        form.topics.data = [topic.id for topic in lecture.topics]
        form.tags.data = [tag.id for tag in lecture.tags]
        form.rank.data = [lecture.rank_id] if lecture.rank_id else []

    return render_template('admin/edit_lecture.html', form=form, lecture=lecture)

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

@app.cli.command("create-admin")
def create_admin():
    """Create an admin user."""
    admin = User(username="admin")
    admin.set_password("BadukAdmin2025!")
    db.session.add(admin)
    db.session.commit()
    print("Admin user created successfully!")