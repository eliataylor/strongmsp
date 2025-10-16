# Generated manually for AgentResponses assessment field

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('strongmsp_app', '0006_alter_notifications_options_notifications_auto_send_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='agentresponses',
            name='assessment',
            field=models.ForeignKey(
                blank=True, 
                null=True, 
                on_delete=django.db.models.deletion.SET_NULL, 
                related_name='+', 
                to='strongmsp_app.assessments', 
                verbose_name='Assessment'
            ),
        ),
    ]
