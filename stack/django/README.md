# NOD Backend

## Installation

1. **Clone the repository:**

    ```sh
    python3 -m venv .venv
    source .venv/bin/activate  # On Windows use `env\Scripts\activate`
    pip install -r requirements.txt
    ```

4. **Apply migrations:**
    ```sh
    python manage.py makemigrations strongmsp_app
    python manage.py migrate
    python manage.py migrate --run-syncdb
    python manage.py makemigrations
    python manage.py collectstatic
   
    ```

5. **Create a superuser:**

    ```sh
    python manage.py createsuperuser
    ```

6. **Run the development server:**

    ```sh
    python manage.py runserver 8088
    python manage.py runserver_plus localapi.strongmindstrongperformance.com:8088 --cert-file ~/.ssh/certificate.crt
    ```

------

# To Connect to remote SQL:
- `sudo /etc/init.d/mysql stop` or `sudo mysql.server stop`
- `./cloud-sql-proxy $GCP_MYSQL_PROJECT_ID:$GCP_MYSQL_ZONE:$GCP_MYSQL_INSTANCE --credentials-file $GCP_SA_KEY_PATH`
- `mysqldump -h 127.0.0.1 -u <DB_USER> -p<DB_PASSWORD> <DB_NAME> > db_dump.sql`
- `mysql -u username -p -h hostname database_name`


----
### O/A Generated Files 
#### The following files have generated code written by [DjangoBuilder.py](src/django/DjangoBuilder.py). Code is injected with comment deliminators such as `####OBJECT-ACTIONS-URLS-STARTS####` and `####OBJECT-ACTIONS-URLS-ENDS####`

1. [urls.py](stack/django/strongmsp_app/urls.py) 

2. [serializers.py](stack/django/strongmsp_app/serializers.py) 

3. [models.py](stack/django/strongmsp_app/models.py) 

4. [views.py](stack/django/strongmsp_app/views.py) 

The builder writes these files based on your Object Types spreadsheet. The surrounding code is provided to make a complete Django API and Admin with a few common search endpoint and Authentication provided by the AllAuth package. API Permissions based on the Permissions Matrix is not yet implemented.  



***__Feel free to edit the file outside comment deliminators for each generated code block. If you edit inside, use git and be aware it could get editted by the builder if you rerun it later.__***

## To Deploy:
- bash deploy/cloud-run.sh -env .env.private

## To Build a GCP project with CloudRun, SQL Cloud, and all necessary service agents, load balancers, ...
Follow instructions in [deploy/README.md](stack/django/deploy/README.md)

## To build django migrations: 
- `docker exec -it django-service bash`
- `python manage.py makemigrations strongmsp_app`
- `python manage.py migrate strongmsp_app`
