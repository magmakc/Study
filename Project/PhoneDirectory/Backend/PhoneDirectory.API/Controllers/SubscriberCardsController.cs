using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhoneDirectory.API.Data;
using PhoneDirectory.API.DTOs;
using PhoneDirectory.API.Models;
using System.Security.Claims;
using System.Text.Json.Serialization;

namespace PhoneDirectory.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SubscriberCardsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SubscriberCardsController> _logger;
        
        public SubscriberCardsController(
            ApplicationDbContext context,
            ILogger<SubscriberCardsController> logger)
        {
            _context = context;
            _logger = logger;
        }
        
        
        // Получить свою карточку
        [HttpGet("my")]
        public async Task<IActionResult> GetMyCard()
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
                
                var card = await _context.SubscriberCards
                    .Include(sc => sc.ContactInfos)
                        .ThenInclude(ci => ci.ContactType)
                    .FirstOrDefaultAsync(sc => sc.UserId == userId);
                    
                if (card == null) 
                {
                    _logger.LogInformation($"Карточка для пользователя {userId} не найдена");
                    return NotFound(new { message = "Карточка не найдена" });
                }
                
                // Создаем DTO без циклических ссылок
                var result = new
                {
                    Id = card.Id,
                    FullName = card.FullName,
                    Position = card.Position,
                    Department = card.Department,
                    Building = card.Building,
                    OfficeNumber = card.OfficeNumber,
                    CreatedAt = card.CreatedAt,
                    UpdatedAt = card.UpdatedAt,
                    ContactInfos = card.ContactInfos.Select(ci => new
                    {
                        Id = ci.Id,
                        ContactTypeId = ci.ContactTypeId,
                        Type = ci.ContactType != null ? ci.ContactType.Name : "Unknown",
                        Value = ci.Value,
                        IsPrimary = ci.IsPrimary
                    }).ToList()
                };
                
                _logger.LogInformation($"Возвращаем карточку пользователя {userId}");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении карточки пользователя");
                return StatusCode(500, new { 
                    message = "Внутренняя ошибка сервера",
                    detail = ex.Message 
                });
            }
        }
        
        // Получить карточку по ID (для просмотра подробной информации)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCard(int id)
        {
            try
            {
                _logger.LogInformation($"Запрос карточки абонента ID: {id}");

                var card = await _context.SubscriberCards
                    .Include(sc => sc.ContactInfos)
                    .ThenInclude(ci => ci.ContactType)
                    .FirstOrDefaultAsync(sc => sc.Id == id);

                if (card == null)
                {
                    _logger.LogWarning($"Карточка с ID={id} не найдена");
                    return NotFound(new { message = "Абонент не найден" });
                }

                var result = new SubscriberDetailsDto
                {
                    Id = card.Id,
                    FullName = card.FullName,
                    Position = card.Position,
                    Department = card.Department,
                    Building = card.Building,
                    OfficeNumber = card.OfficeNumber,
                    CreatedAt = card.CreatedAt,
                    UpdatedAt = card.UpdatedAt,
                    ContactInfos = card.ContactInfos.Select(ci => new ContactInfoDto
                    {
                        Id = ci.Id,
                        Type = ci.ContactType?.Name ?? "Unknown",
                        Value = ci.Value,
                        IsPrimary = ci.IsPrimary
                    }).ToList()
                };

                _logger.LogInformation($"Возвращаем данные карточки ID: {id}");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Ошибка при получении карточки {id}");
                return StatusCode(500, new
                {
                    message = "Внутренняя ошибка сервера",
                    detail = ex.Message
                });
            }
        }
        
        // Обновить свою карточку
        [HttpPut("my")]
        public async Task<IActionResult> UpdateMyCard([FromBody] UpdateProfileDto profileDto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
                var existingCard = await _context.SubscriberCards
                    .Include(sc => sc.ContactInfos)
                    .FirstOrDefaultAsync(sc => sc.UserId == userId);
                    
                if (existingCard == null) 
                {
                    _logger.LogWarning($"Карточка для пользователя {userId} не найдена");
                    return NotFound(new { message = "Карточка не найдена" });
                }
                
                _logger.LogInformation($"Обновление карточки пользователя {userId}");
                
                // Обновляем основные поля
                existingCard.FullName = profileDto.FullName;
                existingCard.Position = profileDto.Position;
                existingCard.Department = profileDto.Department;
                existingCard.Building = profileDto.Building;
                existingCard.OfficeNumber = profileDto.OfficeNumber;
                existingCard.UpdatedAt = DateTime.UtcNow;
                
                // Обновляем контактную информацию
                await UpdateContactInfos(existingCard.Id, profileDto.ContactInfos, true);
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation($"Карточка пользователя {userId} успешно обновлена");
                
                // УБРАНО СООБЩЕНИЕ ОБ УСПЕХЕ
                return Ok(new 
                { 
                    id = existingCard.Id,
                    fullName = existingCard.FullName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Ошибка при обновлении карточки пользователя");
                return StatusCode(500, new { 
                    message = "Внутренняя ошибка сервера",
                    detail = ex.Message 
                });
            }
        }
        
        // Админ: обновить любую карточку
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateCard(int id, [FromBody] UpdateProfileDto profileDto)
        {
            try
            {
                var existingCard = await _context.SubscriberCards
                    .Include(sc => sc.ContactInfos)
                    .FirstOrDefaultAsync(sc => sc.Id == id);
                    
                if (existingCard == null) 
                {
                    _logger.LogWarning($"Карточка с ID={id} не найдена");
                    return NotFound(new { message = "Карточка не найдена" });
                }
                
                _logger.LogInformation($"Админ обновляет карточку ID: {id}");
                
                // Обновляем основные поля
                existingCard.FullName = profileDto.FullName;
                existingCard.Position = profileDto.Position;
                existingCard.Department = profileDto.Department;
                existingCard.Building = profileDto.Building;
                existingCard.OfficeNumber = profileDto.OfficeNumber;
                existingCard.UpdatedAt = DateTime.UtcNow;
                
                // Обновляем контактную информацию
                await UpdateContactInfos(existingCard.Id, profileDto.ContactInfos, false);
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation($"Карточка {id} успешно обновлена администратором");
                
                // УБРАНО СООБЩЕНИЕ ОБ УСПЕХЕ
                return Ok(new 
                { 
                    id = existingCard.Id,
                    fullName = existingCard.FullName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Ошибка при обновлении карточки {id}");
                return StatusCode(500, new { 
                    message = "Внутренняя ошибка сервера",
                    detail = ex.Message 
                });
            }
        }
        
        // Админ: удалить карточку
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCard(int id)
        {
            try
            {
                _logger.LogInformation($"Запрос на удаление карточки ID: {id}");
                
                var card = await _context.SubscriberCards
                    .Include(sc => sc.User)
                    .FirstOrDefaultAsync(sc => sc.Id == id);
                    
                if (card == null) 
                {
                    _logger.LogWarning($"Карточка с ID={id} не найдена для удаления");
                    return NotFound(new { message = "Карточка не найдена" });
                }
                
                // Не позволяем удалить администратора
                if (card.User?.Role == "Admin")
                {
                    _logger.LogWarning($"Попытка удаления администратора с карточкой ID: {id}");
                    return BadRequest(new { message = "Нельзя удалить администратора" });
                }
                
                // Удаляем контактную информацию
                var contactInfos = await _context.ContactInfos
                    .Where(ci => ci.SubscriberCardId == id)
                    .ToListAsync();
                _context.ContactInfos.RemoveRange(contactInfos);
                
                // Удаляем карточку
                _context.SubscriberCards.Remove(card);
                
                // Удаляем пользователя
                if (card.User != null)
                    _context.Users.Remove(card.User);
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation($"Карточка {id} и пользователь успешно удалены");
                
                // ЗАМЕНЕНО НА NoContent() - УБРАНО СООБЩЕНИЕ ОБ УСПЕХЕ
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Ошибка при удалении карточки {id}");
                return StatusCode(500, new { 
                    message = "Внутренняя ошибка сервера",
                    detail = ex.Message 
                });
            }
        }
        
        // Создать карточку (если ее нет)
        [HttpPost("create")]
        public async Task<IActionResult> CreateCard([FromBody] UpdateProfileDto profileDto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
                
                _logger.LogInformation($"Создание карточки для пользователя {userId}");
                
                // Проверяем, нет ли уже карточки у пользователя
                var existingCard = await _context.SubscriberCards
                    .FirstOrDefaultAsync(sc => sc.UserId == userId);
                    
                if (existingCard != null)
                {
                    _logger.LogWarning($"Пользователь {userId} уже имеет карточку ID: {existingCard.Id}");
                    return BadRequest(new { message = "Карточка уже существует" });
                }
                
                // Создаем новую карточку
                var newCard = new SubscriberCard
                {
                    UserId = userId,
                    FullName = profileDto.FullName,
                    Position = profileDto.Position,
                    Department = profileDto.Department,
                    Building = profileDto.Building,
                    OfficeNumber = profileDto.OfficeNumber,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                await _context.SubscriberCards.AddAsync(newCard);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation($"Создана карточка ID: {newCard.Id} для пользователя {userId}");
                
                // Добавляем контактную информацию
                if (profileDto.ContactInfos != null && profileDto.ContactInfos.Count > 0)
                {
                    foreach (var contactDto in profileDto.ContactInfos) // ИСПРАВЛЕНО: profileDocs -> profileDto.ContactInfos
                    {
                        if (!string.IsNullOrWhiteSpace(contactDto.Value))
                        {
                            var contact = new ContactInfo
                            {
                                SubscriberCardId = newCard.Id,
                                ContactTypeId = contactDto.ContactTypeId,
                                Value = contactDto.Value.Trim(),
                                IsPrimary = contactDto.IsPrimary
                            };
                            await _context.ContactInfos.AddAsync(contact);
                        }
                    }
                    
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Добавлены контакты для карточки {newCard.Id}");
                }
                else
                {
                    _logger.LogInformation($"Карточка {newCard.Id} создана без контактов");
                }
                
                // ЗАМЕНЕНО НА CreatedAtAction И УБРАНО СООБЩЕНИЕ ОБ УСПЕХЕ
                return CreatedAtAction(nameof(GetMyCard), new { id = newCard.Id }, new 
                { 
                    id = newCard.Id,
                    fullName = newCard.FullName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при создании карточки");
                return StatusCode(500, new { 
                    message = "Внутренняя ошибка сервера",
                    detail = ex.Message 
                });
            }
        }
        
        private async Task UpdateContactInfos(int subscriberCardId, List<ContactInfoUpdateDto> newContactInfos, bool isOwnProfile)
        {
            _logger.LogInformation($"Обновление контактов для карточки {subscriberCardId}");
            
            // Получаем все существующие контакты карточки
            var existingContacts = await _context.ContactInfos
                .Where(ci => ci.SubscriberCardId == subscriberCardId)
                .ToListAsync();
            
            _logger.LogInformation($"Существующие контакты: {existingContacts.Count}, новые: {newContactInfos?.Count ?? 0}");
            
            // Создаем список для новых контактов
            var contactsToAdd = new List<ContactInfo>();
            
            if (newContactInfos != null && newContactInfos.Count > 0)
            {
                foreach (var newContact in newContactInfos)
                {
                    // Если контакт имеет пустое значение - пропускаем (удаление)
                    if (string.IsNullOrWhiteSpace(newContact.Value))
                    {
                        _logger.LogInformation($"Пропускаем контакт ID: {newContact.Id} - пустое значение");
                        continue;
                    }
                    
                    if (newContact.Id > 0)
                    {
                        // Обновляем существующий контакт
                        var existingContact = existingContacts.FirstOrDefault(ec => ec.Id == newContact.Id);
                        if (existingContact != null)
                        {
                            existingContact.ContactTypeId = newContact.ContactTypeId;
                            existingContact.Value = newContact.Value.Trim();
                            existingContact.IsPrimary = newContact.IsPrimary;
                            _logger.LogInformation($"Обновлен существующий контакт ID: {newContact.Id}");
                        }
                        else
                        {
                            // Контакт с таким ID не найден, добавляем как новый
                            var contactToAdd = new ContactInfo
                            {
                                SubscriberCardId = subscriberCardId,
                                ContactTypeId = newContact.ContactTypeId,
                                Value = newContact.Value.Trim(),
                                IsPrimary = newContact.IsPrimary
                            };
                            contactsToAdd.Add(contactToAdd);
                            _logger.LogInformation($"Добавлен новый контакт (был ID: {newContact.Id}, но не найден в БД)");
                        }
                    }
                    else
                    {
                        // Добавляем новый контакт
                        var contactToAdd = new ContactInfo
                        {
                            SubscriberCardId = subscriberCardId,
                            ContactTypeId = newContact.ContactTypeId,
                            Value = newContact.Value.Trim(),
                            IsPrimary = newContact.IsPrimary
                        };
                        contactsToAdd.Add(contactToAdd);
                        _logger.LogInformation($"Добавлен новый контакт типа {newContact.ContactTypeId}");
                    }
                }
            }
            
            // Удаляем контакты, которые не были обновлены или не добавлены
            // (те, которые удалены пользователем)
            var contactsToRemove = existingContacts
                .Where(ec => newContactInfos == null || 
                            !newContactInfos.Any(nc => nc.Id == ec.Id && !string.IsNullOrWhiteSpace(nc.Value)))
                .ToList();
            
            _logger.LogInformation($"К удалению: {contactsToRemove.Count} контактов");
            _context.ContactInfos.RemoveRange(contactsToRemove);
            
            // Добавляем новые контакты
            _context.ContactInfos.AddRange(contactsToAdd);
            
            await _context.SaveChangesAsync();
            _logger.LogInformation($"Контакты для карточки {subscriberCardId} успешно обновлены");
            
            // Убедимся, что только один контакт помечен как основной
            await EnsureSinglePrimaryContact(subscriberCardId);
        }
        
        // Вспомогательный метод: убедиться, что только один контакт помечен как основной
        private async Task EnsureSinglePrimaryContact(int subscriberCardId)
        {
            var contacts = await _context.ContactInfos
                .Where(ci => ci.SubscriberCardId == subscriberCardId)
                .ToListAsync();
            
            var primaryContacts = contacts.Where(c => c.IsPrimary).ToList();
            
            if (primaryContacts.Count > 1)
            {
                // Если больше одного основного, оставляем только первый
                for (int i = 1; i < primaryContacts.Count; i++)
                {
                    primaryContacts[i].IsPrimary = false;
                }
            }
            else if (primaryContacts.Count == 0 && contacts.Count > 0)
            {
                // Если нет основного, но есть контакты, делаем первый основным
                contacts[0].IsPrimary = true;
            }
        }
    }
    
    
}