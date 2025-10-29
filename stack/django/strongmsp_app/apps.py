from django.apps import AppConfig


class StrongmspAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'strongmsp_app'
    
    def ready(self):
        # Import signals to ensure they are registered
        import strongmsp_app.signals