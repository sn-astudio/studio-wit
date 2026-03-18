"""SQLAdmin 설정 — /admin 에서 DB 관리 UI 제공"""

from __future__ import annotations

from sqladmin import Admin, ModelView

from app.models.database import User, Generation, Like, engine


class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"
    column_list = [
        User.id,
        User.email,
        User.name,
        User.google_id,
        User.created_at,
    ]
    column_searchable_list = [User.email, User.name, User.google_id]
    column_sortable_list = [User.email, User.name, User.created_at]
    column_default_sort = ("created_at", True)
    page_size = 25


class GenerationAdmin(ModelView, model=Generation):
    name = "Generation"
    name_plural = "Generations"
    icon = "fa-solid fa-image"
    column_list = [
        Generation.id,
        Generation.user_id,
        Generation.model_id,
        Generation.type,
        Generation.status,
        Generation.prompt,
        Generation.is_public,
        Generation.created_at,
    ]
    column_searchable_list = [Generation.prompt, Generation.model_id]
    column_sortable_list = [
        Generation.type,
        Generation.status,
        Generation.model_id,
        Generation.created_at,
    ]
    column_default_sort = ("created_at", True)
    page_size = 25


class LikeAdmin(ModelView, model=Like):
    name = "Like"
    name_plural = "Likes"
    icon = "fa-solid fa-heart"
    column_list = [
        Like.id,
        Like.user_id,
        Like.generation_id,
        Like.created_at,
    ]
    column_sortable_list = [Like.created_at]
    column_default_sort = ("created_at", True)
    page_size = 25


def setup_admin(app) -> Admin:
    """FastAPI 앱에 SQLAdmin 마운트"""
    admin = Admin(app, engine, title="Wit Admin")
    admin.add_view(UserAdmin)
    admin.add_view(GenerationAdmin)
    admin.add_view(LikeAdmin)
    return admin
