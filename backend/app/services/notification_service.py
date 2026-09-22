import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.notification import Notification

logger = logging.getLogger("notification_service")

def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None
) -> Optional[Notification]:
    """Create a real event-driven notification for a user."""
    try:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    except Exception as e:
        logger.error(f"Failed to create notification for user {user_id}: {e}")
        db.rollback()
        return None

def create_bulk_notifications(
    db: Session,
    user_ids: List[int],
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None
) -> int:
    """Create notifications for multiple users in a single transaction."""
    if not user_ids:
        return 0
    try:
        notifs = [
            Notification(
                user_id=uid,
                type=type,
                title=title,
                message=message,
                link=link
            )
            for uid in user_ids
        ]
        db.add_all(notifs)
        db.commit()
        return len(notifs)
    except Exception as e:
        logger.error(f"Failed to create bulk notifications: {e}")
        db.rollback()
        return 0

def get_user_notifications(db: Session, user_id: int) -> List[Notification]:
    """Retrieve all notifications for a user, newest first."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> Optional[Notification]:
    """Mark a specific notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif

def mark_all_notifications_read(db: Session, user_id: int) -> int:
    """Mark all unread notifications for a user as read."""
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .update({"is_read": True})
    )
    db.commit()
    return updated
