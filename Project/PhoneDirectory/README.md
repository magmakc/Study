# README.md

# Управление кадрами

## Структура проекта

// Версия 1

PhoneDirectory/
├── Controllers/         # API контроллеры  
│   ├── AuthController.cs  
│   ├── DirectoryController.cs  
│   ├── SubscriberCardsController.cs  
│   └── ContactTypesController.cs  
├── Data/               # Доступ к данным  
│   ├── ApplicationDbContext.cs  
│   └── SeedData.cs  
├── Models/             # Модели данных  
│   ├── User.cs  
│   └── SubscriberCard.cs  
├── Services/           # Сервисы  
│   ├── JwtService.cs  
│   └── PasswordService.cs  
├── DTOs/               # Data Transfer Objects  
│   ├── AuthDTO.cs  
│   ├── ProfileDTO.cs  
│   └── ResponseDTOs.cs  
├── wwwroot/            # Фронтенд  
│   ├── index.html  
│   ├── css/  
│   │   └── style.css  
│   └── js/  
│       └── app.js  
├── Program.cs          # Точка входа  
├── appsettings.json    # Конфигурация  
└── PhoneDirectory.API.csproj  

## Требования к системе

### Необходимое программное обеспечение

1. .NET SDK 9.0 или выше  
2. PostgreSQL 15 или выше  
3. Node.js 18 или выше (только для разработки фронтенда)  
4. Git (для клонирования репозитория (опционально))  

## Быстрый старт (Windows)

### 1. Установка необходимого ПО

#### Установите .NET SDK 9.0

Запомните пароль пользователя postgres (пароль: 1234)

При установке выберите порт по умолчанию (5432)

Запустите pgAdmin или используйте psql

Установите Node.js (опционально, для разработки):

### 2. Настройка базы данных

#### Через pgAdmin

Откройте pgAdmin

Создайте новую базу данных:

Имя: PhoneDB

Владелец: postgres

Проверьте подключение

#### Или через командную строку

```sql
-- Подключитесь к PostgreSQL
psql -U postgres

-- Создайте базу данных
CREATE DATABASE "PhoneDirectoryDB";
```

### 3. Настройка проекта

Клонируйте репозиторий (если нужно):
```bash
git clone <ваш-репозиторий>
cd PhoneDirectory
```

Проверьте файл `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=PhoneDirectoryDB;Username=postgres;Password=12345"
  }
}
```
Примечание: Если вы использовали другой пароль при установке PostgreSQL, измените его в строке подключения.

### 4. Восстановление зависимостей

Восстановите NuGet пакеты:
```bash
dotnet restore
```

#### Список основных пакетов (уже указаны в `.csproj`)

- dotnet add package Microsoft.EntityFrameworkCore --version 9.0.11
- dotnet add package Microsoft.EntityFrameworkCore.Design --version 9.0.11
- dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 9.0.0
- dotnet add package Microsoft.EntityFrameworkCore.Tools --version 9.0.11
- dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 9.0.0
- dotnet add package BCrypt.Net-Next --version 4.0.3
- dotnet add package Swashbuckle.AspNetCore --version 7.2.0

### 5. Применение миграций базы данных

Создайте миграции (если их еще нет):
```bash
dotnet ef migrations add InitialCreate
```

Примените миграции:
```bash
dotnet ef database update
```
Или при первом запуске приложения миграции применятся автоматически через код в `Program.cs`.

### 6. Запуск приложения

Запустите приложение (запуск должен производится из PhoneDirectory.API):
```bash
dotnet build
```
```bash
dotnet run
```
Или для запуска в режиме разработки:
```bash
dotnet watch run
```

### 7. Проверка работы

После успешного запуска откройте браузер и перейдите по адресу:

Фронтенд приложения: http://localhost:5050

### Тестовые пользователи

После запуска и применения сидов создаются тестовые пользователи:

#### Администратор

- Логин: admin  
- Пароль: admin123  
- Роль: Администратор  

#### Обычный пользователь

- Логин: user1  
- Пароль: user123  
- Роль: Подписчик (Subscriber)  

## Разработка фронтенда

### Структура фронтенда

```
wwwroot/
├── index.html          # Главная страница  
├── css/  
│   └── style.css      # Стили  
└── js/  
    └── app.js         # Основной JavaScript код  
```

### Для внесения изменений

- Отредактируйте файлы в папке `wwwroot/`  
- Перезапустите приложение:  
```bash
dotnet clean
dotnet restore
dotnet build
dotnet run
```

## Настройка окружения

### Настройка для продакшн

Измените строку подключения в `appsettings.json`

### Установите надежный JWT ключ

```json
{
  "Jwt": {
    "Key": "надежный_ключ_минимум_32_символа"
  }
}
```

### Настройте CORS при необходимости

```csharp
// В Program.cs измените политику CORS
options.AddPolicy("ProductionPolicy",
    policy =>
    {
        policy.WithOrigins("https://ваш-домен.com")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
```

## Устранение неполадок

### Ошибка подключения к базе данных

Проверьте, запущен ли PostgreSQL:
```powershell
# Windows
Get-Service postgresql*

# Linux
sudo systemctl status postgresql
```
Проверьте строку подключения в `appsettings.json`.  
Убедитесь, что база данных существует.

### Ошибка "Port already in use"

Измените порт в `appsettings.json`:
```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5051"  // Измените порт
      }
    }
  }
}
```

### Ошибка миграций

Удалите папку `Migrations/` (если есть).  
Создайте миграцию заново:
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### Ошибка дублирования ключей

Удаите папки bin, obj

Перезапустите приложение:  
```bash
dotnet clean
dotnet restore
dotnet build
dotnet run
```

## Docker (опционально)

### Если вы хотите запустить в Docker

#### Создайте Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 5050

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["PhoneDirectory.API.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PhoneDirectory.API.dll"]
```

#### Создайте docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: PhoneDirectoryDB1
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 1234
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "5050:5050"
    environment:
      ConnectionStrings__DefaultConnection: "Host=postgres;Port=5432;Database=PhoneDirectoryDB1;Username=postgres;Password=1234"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

#### Запустите

```bash
docker-compose up --build
```