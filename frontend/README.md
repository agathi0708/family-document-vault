# Family Document Vault

A secure family document management application built with **React, FastAPI, PostgreSQL, and OCR**. Family members can organize documents and access them according to their assigned permissions.

## Features

- **Authentication:** User registration and login with token-based authentication.
- **Document management:** Upload, view, download, and delete documents according to permissions.
- **OCR:** Extract text from supported document images and PDFs.
- **Family management:** Organize documents around families and manage family memberships.
- **Role-based access control:** Apply different permissions for owners, members, and viewers.
- **Database migrations:** Manage database schema changes with Alembic.
- **Containerized database:** Run PostgreSQL using Docker Compose.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Database migrations | Alembic |
| OCR | PaddleOCR |
| Authentication | JWT |
| Infrastructure | Docker Compose |

## Prerequisites

- Python 3.12
- Node.js and npm
- Docker Desktop
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd family-document-vault
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

The development configuration maps PostgreSQL to port `5433` on your computer.

### 3. Configure the backend

Create your local environment file using the example:

```powershell
Copy-Item backend/.env.example backend/.env
```

Review `backend/.env` and set your own database credentials and a strong JWT secret. Never commit this file.

### 4. Install backend dependencies

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Return to the project root before continuing:

```powershell
cd ..
```

### 5. Initialize the database

Apply the available Alembic migrations:

```powershell
cd backend
alembic upgrade head
cd ..
```

### 6. Start the backend

From the project root, with the backend virtual environment activated:

```powershell
cd backend
uvicorn app.main:app --reload
```

The API should be available at `http://127.0.0.1:8000`. If enabled in the application, API documentation is available at `http://127.0.0.1:8000/docs`.

### 7. Start the frontend

Open a second terminal at the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Security

- Keep `.env` files and production credentials private.
- Do not commit uploaded documents or database backups.
- Use a strong, unique JWT secret outside development.
- Verify role-based permissions before deploying.
- Configure HTTPS and appropriate production storage before exposing the application publicly.

## Development Status

Authentication, document operations, OCR integration, family membership, and role-based permissions have been exercised during development. Run additional automated tests before production deployment.

## License

Add a license before distributing this project publicly.
