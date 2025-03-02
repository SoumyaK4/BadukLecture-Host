from flask import render_template, redirect, url_for, request, jsonify, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import User, Lecture, Topic, Tag, Rank
from forms import LoginForm, LectureForm, MetadataForm
from utils import get_youtube_video_info
import logging
import json
from datetime import datetime

@app.route('/')
def home():
    # Optimize query by eagerly loading relationships
    lectures = Lecture.query.options(
        db.joinedload(Lecture.topics),
        db.joinedload(Lecture.tags),
        db.joinedload(Lecture.rank)
    ).order_by(Lecture.publish_date.desc()).limit(6).all()
    return render_template('home.html', lectures=lectures)

@app.route('/search')
def search():
    # Get only necessary metadata
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

        # Build efficient query with eager loading
        lectures_query = Lecture.query.options(
            db.joinedload(Lecture.topics),
            db.joinedload(Lecture.tags)
        )

        # Apply filters
        if query:
            lectures_query = lectures_query.filter(Lecture.title.ilike(f'%{query}%'))

        # More efficient topic filtering
        if topic_ids and any(topic_ids):
            # Filter only non-empty topic IDs
            valid_topic_ids = [tid for tid in topic_ids if tid]
            if valid_topic_ids:
                lectures_query = lectures_query.join(Lecture.topics).filter(Topic.id.in_(valid_topic_ids))

        # More efficient tag filtering
        if tag_ids and any(tag_ids):
            # Filter only non-empty tag IDs
            valid_tag_ids = [tid for tid in tag_ids if tid]
            if valid_tag_ids:
                lectures_query = lectures_query.join(Lecture.tags).filter(Tag.id.in_(valid_tag_ids))

        if rank_id:
            lectures_query = lectures_query.filter_by(rank_id=rank_id)

        # Apply sorting
        if sort_by == 'date':
            lectures_query = lectures_query.order_by(Lecture.publish_date.desc())
        elif sort_by == 'rank':
            lectures_query = lectures_query.order_by(Lecture.rank_id)

        # Add pagination
        pagination = lectures_query.paginate(page=page, per_page=per_page, error_out=False)
        lectures = pagination.items

        # Cache rank lookups
        rank_cache = {}
        
        # Process results
        lecture_data = []
        for l in lectures:
            # Use cached rank lookup
            if l.rank_id:
                if l.rank_id not in rank_cache:
                    rank = Rank.query.get(l.rank_id)
                    rank_cache[l.rank_id] = rank.name if rank else None
                rank_name = rank_cache[l.rank_id]
            else:
                rank_name = None
                
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
        logging.error(f"Error in api_search: {str(e)}")
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

@app.route('/admin/export', methods=['GET'])
@login_required
def export_data():
    try:
        # Get all data
        lectures = Lecture.query.all()
        topics = Topic.query.all()
        tags = Tag.query.all()
        ranks = Rank.query.all()
        
        # Prepare data for export
        export_data = {
            'lectures': [],
            'topics': [],
            'tags': [],
            'ranks': []
        }
        
        # Add topics
        for topic in topics:
            export_data['topics'].append({
                'id': topic.id,
                'name': topic.name
            })
            
        # Add tags
        for tag in tags:
            export_data['tags'].append({
                'id': tag.id,
                'name': tag.name
            })
            
        # Add ranks
        for rank in ranks:
            export_data['ranks'].append({
                'id': rank.id,
                'name': rank.name
            })
            
        # Add lectures
        for lecture in lectures:
            lecture_data = {
                'id': lecture.id,
                'title': lecture.title,
                'youtube_id': lecture.youtube_id,
                'thumbnail_url': lecture.thumbnail_url,
                'publish_date': lecture.publish_date.isoformat(),
                'rank_id': lecture.rank_id,
                'topic_ids': [topic.id for topic in lecture.topics],
                'tag_ids': [tag.id for tag in lecture.tags]
            }
            export_data['lectures'].append(lecture_data)
        
        # Return JSON file for download
        return jsonify(export_data)
    except Exception as e:
        logging.error(f"Error exporting data: {str(e)}")
        flash('Error exporting data')
        return redirect(url_for('admin_panel'))

@app.route('/admin/import', methods=['GET', 'POST'])
@login_required
def import_data():
    if request.method == 'POST':
        try:
            if 'import_file' not in request.files:
                flash('No file part')
                return redirect(request.url)
                
            file = request.files['import_file']
            if file.filename == '':
                flash('No selected file')
                return redirect(request.url)
                
            if file:
                import_data = json.loads(file.read().decode('utf-8'))
                
                # Process topics
                topic_id_map = {}
                if 'topics' in import_data:
                    for topic_data in import_data['topics']:
                        # Check if topic already exists
                        existing_topic = Topic.query.filter_by(name=topic_data['name']).first()
                        if not existing_topic:
                            new_topic = Topic(name=topic_data['name'])
                            db.session.add(new_topic)
                            db.session.flush()
                            topic_id_map[topic_data['id']] = new_topic.id
                        else:
                            topic_id_map[topic_data['id']] = existing_topic.id
                
                # Process tags
                tag_id_map = {}
                if 'tags' in import_data:
                    for tag_data in import_data['tags']:
                        # Check if tag already exists
                        existing_tag = Tag.query.filter_by(name=tag_data['name']).first()
                        if not existing_tag:
                            new_tag = Tag(name=tag_data['name'])
                            db.session.add(new_tag)
                            db.session.flush()
                            tag_id_map[tag_data['id']] = new_tag.id
                        else:
                            tag_id_map[tag_data['id']] = existing_tag.id
                
                # Process ranks
                rank_id_map = {}
                if 'ranks' in import_data:
                    for rank_data in import_data['ranks']:
                        # Check if rank already exists
                        existing_rank = Rank.query.filter_by(name=rank_data['name']).first()
                        if not existing_rank:
                            new_rank = Rank(name=rank_data['name'])
                            db.session.add(new_rank)
                            db.session.flush()
                            rank_id_map[rank_data['id']] = new_rank.id
                        else:
                            rank_id_map[rank_data['id']] = existing_rank.id
                
                # Process lectures
                if 'lectures' in import_data:
                    for lecture_data in import_data['lectures']:
                        # Check if lecture already exists by YouTube ID
                        existing_lecture = Lecture.query.filter_by(youtube_id=lecture_data['youtube_id']).first()
                        if not existing_lecture:
                            new_lecture = Lecture(
                                title=lecture_data['title'],
                                youtube_id=lecture_data['youtube_id'],
                                thumbnail_url=lecture_data['thumbnail_url'],
                                publish_date=datetime.fromisoformat(lecture_data['publish_date'])
                            )
                            
                            # Set rank
                            if lecture_data.get('rank_id') and lecture_data['rank_id'] in rank_id_map:
                                new_lecture.rank_id = rank_id_map[lecture_data['rank_id']]
                            
                            # Add topics
                            if 'topic_ids' in lecture_data:
                                for old_topic_id in lecture_data['topic_ids']:
                                    if old_topic_id in topic_id_map:
                                        topic = Topic.query.get(topic_id_map[old_topic_id])
                                        if topic:
                                            new_lecture.topics.append(topic)
                            
                            # Add tags
                            if 'tag_ids' in lecture_data:
                                for old_tag_id in lecture_data['tag_ids']:
                                    if old_tag_id in tag_id_map:
                                        tag = Tag.query.get(tag_id_map[old_tag_id])
                                        if tag:
                                            new_lecture.tags.append(tag)
                            
                            db.session.add(new_lecture)
                
                db.session.commit()
                flash('Data imported successfully')
                return redirect(url_for('admin_panel'))
                
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error importing data: {str(e)}")
            flash(f'Error importing data: {str(e)}')
            return redirect(request.url)
    
    return render_template('admin/import.html')

@app.route('/admin/reset', methods=['POST'])
@login_required
def reset_data():
    try:
        # Get all data first for backup
        lectures = Lecture.query.all()
        topics = Topic.query.all()
        tags = Tag.query.all()
        ranks = Rank.query.all()
        
        # Prepare data for export (same as in export_data)
        export_data = {
            'lectures': [],
            'topics': [],
            'tags': [],
            'ranks': []
        }
        
        # Add topics
        for topic in topics:
            export_data['topics'].append({
                'id': topic.id,
                'name': topic.name
            })
            
        # Add tags
        for tag in tags:
            export_data['tags'].append({
                'id': tag.id,
                'name': tag.name
            })
            
        # Add ranks
        for rank in ranks:
            export_data['ranks'].append({
                'id': rank.id,
                'name': rank.name
            })
            
        # Add lectures
        for lecture in lectures:
            lecture_data = {
                'id': lecture.id,
                'title': lecture.title,
                'youtube_id': lecture.youtube_id,
                'thumbnail_url': lecture.thumbnail_url,
                'publish_date': lecture.publish_date.isoformat(),
                'rank_id': lecture.rank_id,
                'topic_ids': [topic.id for topic in lecture.topics],
                'tag_ids': [tag.id for tag in lecture.tags]
            }
            export_data['lectures'].append(lecture_data)
        
        # Clear database
        # Use raw SQL for faster deletion of many records
        db.session.execute(db.text("DELETE FROM lecture_topic"))
        db.session.execute(db.text("DELETE FROM lecture_tag"))
        db.session.execute(db.text("DELETE FROM lecture"))
        db.session.execute(db.text("DELETE FROM topic"))
        db.session.execute(db.text("DELETE FROM tag"))
        db.session.execute(db.text("DELETE FROM rank"))
        db.session.commit()
        
        flash('All data has been reset successfully')
        # Return JSON for download
        return jsonify(export_data)
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error resetting data: {str(e)}")
        flash(f'Error resetting data: {str(e)}')
        return redirect(url_for('admin_panel'))

@app.route('/admin')
@login_required
def admin_panel():
    return render_template('admin/panel.html')

@app.cli.command("create-admin")
def create_admin():
    """Create an admin user."""
    admin = User(username="admin")
    admin.set_password("BadukAdmin2025!")
    db.session.add(admin)
    db.session.commit()
    print("Admin user created successfully!")