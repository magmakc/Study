using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PhoneDirectory.API.Models;

namespace PhoneDirectory.API.Data
{
    public static class SeedData
    {
        public static async Task Initialize(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            // Типы контактов
            if (!await context.ContactTypes.AnyAsync())
            {
                await context.ContactTypes.AddRangeAsync(
                    new ContactType { Name = "InternalPhone", Description = "Внутренний телефон" },
                    new ContactType { Name = "CityPhone", Description = "Городской телефон" },
                    new ContactType { Name = "MobilePhone", Description = "Мобильный телефон" },
                    new ContactType { Name = "Email", Description = "Электронная почта" },
                    new ContactType { Name = "WorkEmail", Description = "Рабочая почта" }
                );
                await context.SaveChangesAsync();
            }

            // Администратор
            if (!await context.Users.AnyAsync(u => u.Username == "admin"))
            {
                var admin = new User
                {
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Email = "admin@company.com",
                    Role = "Admin",
                    FullName = "Администратор",
                    CreatedAt = DateTime.UtcNow
                };
                
                await context.Users.AddAsync(admin);
                await context.SaveChangesAsync();
                
                // Создаем карточку для администратора
                var adminCard = new SubscriberCard
                {
                    UserId = admin.Id,
                    FullName = "Администратор",
                    Position = "Системный администратор",
                    Department = "ИТ отдел",
                    Building = "Главный",
                    OfficeNumber = "101",
                    InternalPhone = "1000",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                await context.SubscriberCards.AddAsync(adminCard);
                await context.SaveChangesAsync();
            }
            
            // Тестовый пользователь
            if (!await context.Users.AnyAsync(u => u.Username == "user1"))
            {
                var user1 = new User
                {
                    Username = "user1",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123"),
                    Email = "user1@company.com",
                    Role = "Subscriber",
                    FullName = "Иванов Иван Иванович",
                    CreatedAt = DateTime.UtcNow
                };
                
                await context.Users.AddAsync(user1);
                await context.SaveChangesAsync();
                
                var user1Card = new SubscriberCard
                {
                    UserId = user1.Id,
                    FullName = "Иванов Иван Иванович",
                    Position = "Инженер",
                    Department = "Технический отдел",
                    Building = "Корпус 1",
                    OfficeNumber = "205",
                    InternalPhone = "1234",
                    MobilePhone = "+79001234567",
                    Email = "ivanov@company.com",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                await context.SubscriberCards.AddAsync(user1Card);
                await context.SaveChangesAsync();
                
                // Добавляем контактную информацию
                var internalPhoneType = await context.ContactTypes
                    .FirstOrDefaultAsync(ct => ct.Name == "InternalPhone");
                    
                if (internalPhoneType != null)
                {
                    var contactInfo = new ContactInfo
                    {
                        SubscriberCardId = user1Card.Id,
                        ContactTypeId = internalPhoneType.Id,
                        Value = "1234",
                        IsPrimary = true
                    };
                    
                    await context.ContactInfos.AddAsync(contactInfo);
                    await context.SaveChangesAsync();
                }
            }
            
            Console.WriteLine("Начальные данные успешно добавлены в базу данных");
        }
    }
}