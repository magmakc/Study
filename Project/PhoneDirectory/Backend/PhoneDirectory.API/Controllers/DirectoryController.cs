using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhoneDirectory.API.Data;
using PhoneDirectory.API.Models;
using PhoneDirectory.API.DTOs;
using System.Security.Claims;

namespace PhoneDirectory.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DirectoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DirectoryController> _logger;
        
        public DirectoryController(
            ApplicationDbContext context,
            ILogger<DirectoryController> logger)
        {
            _context = context;
            _logger = logger;
        }
        
        [HttpGet("subscribers")]
        public async Task<IActionResult> GetSubscribers([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
        {
            try
            {
                var query = _context.SubscriberCards.AsQueryable();
                
                // Применение поиска
                if (!string.IsNullOrEmpty(search))
                {
                    var searchTerm = search.ToLower();
                    query = query.Where(s => 
                        s.FullName.ToLower().Contains(searchTerm) ||
                        s.Position != null && s.Position.ToLower().Contains(searchTerm) ||
                        s.Department != null && s.Department.ToLower().Contains(searchTerm) ||
                        s.InternalPhone != null && s.InternalPhone.Contains(search) ||
                        s.MobilePhone != null && s.MobilePhone.Contains(search));
                }
                
                // Получение общего количества для пагинации
                var totalCount = await query.CountAsync();
                
                // Применение пагинации
                var items = await query
                    .OrderBy(s => s.FullName)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(s => new
                    {
                        s.Id,
                        s.FullName,
                        s.Position,
                        s.Department,
                        s.Building,
                        s.OfficeNumber,
                        s.InternalPhone,
                        s.CityPhone,
                        s.MobilePhone,
                        s.Email
                    })
                    .ToListAsync();
                
                var response = new
                {
                    Items = items,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                };
                
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении списка абонентов");
                return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
            }
        }
        
        [HttpGet("subscribers/{id}")]
        public async Task<IActionResult> GetSubscriber(int id)
        {
            try
            {
                var subscriber = await _context.SubscriberCards
                    .FirstOrDefaultAsync(s => s.Id == id);
                    
                if (subscriber == null)
                {
                    return NotFound(new { message = "Абонент не найден" });
                }
                
                return Ok(new
                {
                    subscriber.Id,
                    subscriber.FullName,
                    subscriber.Position,
                    subscriber.Department,
                    subscriber.Building,
                    subscriber.OfficeNumber,
                    subscriber.InternalPhone,
                    subscriber.CityPhone,
                    subscriber.MobilePhone,
                    subscriber.Email
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении абонента {Id}", id);
                return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
            }
        }
        
        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
            try
            {
                var departments = await _context.SubscriberCards
                    .Where(s => s.Department != null)
                    .Select(s => s.Department!)
                    .Distinct()
                    .OrderBy(d => d)
                    .ToListAsync();
                    
                return Ok(departments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении списка подразделений");
                return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
            }
        }
        
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] SearchRequestDto request)
        {
            var query = _context.SubscriberCards.AsQueryable();
            
            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(s => 
                    s.FullName.ToLower().Contains(term) ||
                    (s.Position != null && s.Position.ToLower().Contains(term)) ||
                    (s.Department != null && s.Department.ToLower().Contains(term)) ||
                    (s.InternalPhone != null && s.InternalPhone.Contains(request.SearchTerm)) ||
                    (s.MobilePhone != null && s.MobilePhone.Contains(request.SearchTerm)) ||
                    (s.CityPhone != null && s.CityPhone.Contains(request.SearchTerm)) ||
                    (s.Email != null && s.Email.Contains(request.SearchTerm)));
            }
            
            if (!string.IsNullOrEmpty(request.Department))
                query = query.Where(s => s.Department == request.Department);
                
            if (!string.IsNullOrEmpty(request.Position))
                query = query.Where(s => s.Position == request.Position);
            
            var totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(s => s.FullName)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(s => new SubscriberCardDto
                {
                    Id = s.Id,
                    FullName = s.FullName,
                    Position = s.Position,
                    Department = s.Department,
                    Building = s.Building,
                    OfficeNumber = s.OfficeNumber,
                    HireDate = s.HireDate,
                    WorkExperience = s.WorkExperience,
                    ContactInfos = s.ContactInfos.Select(ci => new ContactInfoDto
                    {
                        Id = ci.Id,
                        Type = ci.ContactType != null ? ci.ContactType.Name : "Unknown",
                        Value = ci.Value,
                        IsPrimary = ci.IsPrimary
                    }).ToList()
                })
                .ToListAsync();

            return Ok(new PaginatedResponseDto<SubscriberCardDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            });
        }

        [HttpGet("positions")]
        public async Task<IActionResult> GetPositions()
        {
            try
            {
                var positions = await _context.SubscriberCards
                    .Where(s => s.Position != null)
                    .Select(s => s.Position!)
                    .Distinct()
                    .OrderBy(p => p)
                    .ToListAsync();

                return Ok(positions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении списка должностей");
                return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
            }
        }
        
        [HttpGet("advanced-search")]
        public async Task<IActionResult> AdvancedSearch(
            [FromQuery] string? name,
            [FromQuery] string? position,
            [FromQuery] string? department,
            [FromQuery] string? phone,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var query = _context.SubscriberCards
                    .Include(s => s.ContactInfos)
                    .ThenInclude(ci => ci.ContactType)
                    .AsQueryable();
                
                // Применяем фильтры
                if (!string.IsNullOrEmpty(name))
                {
                    query = query.Where(s => s.FullName.ToLower().Contains(name.ToLower()));
                }
                
                if (!string.IsNullOrEmpty(position))
                {
                    query = query.Where(s => s.Position != null && 
                                           s.Position.ToLower().Contains(position.ToLower()));
                }
                
                if (!string.IsNullOrEmpty(department))
                {
                    query = query.Where(s => s.Department != null && 
                                           s.Department.ToLower().Contains(department.ToLower()));
                }
                
                if (!string.IsNullOrEmpty(phone))
                {
                    query = query.Where(s => 
                        (s.InternalPhone != null && s.InternalPhone.Contains(phone)) ||
                        (s.CityPhone != null && s.CityPhone.Contains(phone)) ||
                        (s.MobilePhone != null && s.MobilePhone.Contains(phone)) ||
                        s.ContactInfos.Any(ci => ci.Value.Contains(phone))
                    );
                }
                
                // Получаем общее количество
                var totalCount = await query.CountAsync();

                // Применяем пагинацию
                var items = await query
                    .OrderBy(s => s.FullName)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(s => new SubscriberCardDto
                    {
                        Id = s.Id,
                        FullName = s.FullName,
                        Position = s.Position,
                        Department = s.Department,
                        Building = s.Building,
                        OfficeNumber = s.OfficeNumber,
                        HireDate = s.HireDate,
                        WorkExperience = s.WorkExperience,
                        ContactInfos = s.ContactInfos.Select(ci => new ContactInfoDto
                        {
                            Id = ci.Id,
                            Type = ci.ContactType != null ? ci.ContactType.Name : "Unknown",
                            Value = ci.Value,
                            IsPrimary = ci.IsPrimary
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(new PaginatedResponseDto<SubscriberCardDto>
                {
                    Items = items,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при расширенном поиске");
                return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
            }
        }
        
        [HttpGet("my-profile")]
        public async Task<IActionResult> GetMyProfile()
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var username = User.FindFirst(ClaimTypes.Name)?.Value;
                
                var subscriber = await _context.SubscriberCards
                    .Include(s => s.ContactInfos)
                    .ThenInclude(ci => ci.ContactType)
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(s => s.UserId == userId);
                    
                if (subscriber == null)
                {
                    return NotFound(new { message = "Профиль не найден" });
                }
                
                return Ok(new
                {
                    Id = subscriber.Id,
                    FullName = subscriber.FullName,
                    Position = subscriber.Position,
                    Department = subscriber.Department,
                    Building = subscriber.Building,
                    OfficeNumber = subscriber.OfficeNumber,
                    HireDate = subscriber.HireDate,
                    WorkExperience = subscriber.WorkExperience,
                    Username = username,
                    Email = subscriber.User?.Email,
                    Role = subscriber.User?.Role,
                    ContactInfos = subscriber.ContactInfos.Select(ci => new
                    {
                        Id = ci.Id,
                        Type = ci.ContactType?.Name,
                        Value = ci.Value,
                        IsPrimary = ci.IsPrimary
                    }).ToList()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении профиля");
                return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
            }
        }
    }
}