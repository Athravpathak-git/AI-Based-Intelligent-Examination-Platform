# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.database import Base  # noqa
from app.models.user import User  # noqa
from app.models.question import QuestionBank, Option  # noqa
from app.models.exam import Exam, ExamQuestion  # noqa
from app.models.session import ExamSession, Answer  # noqa
from app.models.result import Result  # noqa
from app.models.proctor import ProctorEvent  # noqa
from app.models.registration import ExamRegistration  # noqa
from app.models.student_profile import StudentProfile  # noqa
from app.models.notification import Notification  # noqa
from app.models.attempt_permission import ExamAttemptPermission, ExamInstructionAcceptance  # noqa
