using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhoneDirectory.API.Data;
using PhoneDirectory.API.Models;
using PhoneDirectory.API.Services;
using System.Security.Claims;

namespace PhoneDirectory.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IPasswordService _passwordService;
        private readonly ILogger<AuthController> _logger;
        
        public AuthController(
            ApplicationDbContext context,
            IJwtService jwtService,
            IPasswordService passwordService,
            ILogger<AuthController> logger)
        {
            _context = context;
            _jwtService = jwtService;
            _passwordService = passwordService;
            _logger = logger;
        }
        
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.SubscriberCard)
                    .FirstOrDefaultAsync(u => u.Username == request.Username);
                    
                if (user == null)
                {
                    return Unauthorized(new { message = "Неверное имя пользователя или пароль" });
                }
                
                // Проверяем пароль с использованием PasswordService
                if (!_passwordService.VerifyPassword(request.Password, user.PasswordHash))
                {
                    return Unauthorized(new { message = "Неверное имя пользователя или пароль" });
                }
                
                var token = _jwtService.GenerateToken(user);
                
                return Ok(new 
                { 
                    Token = token,
                    Username = user.Username,
                    Role = user.Role,
                    FullName = user.FullName,
                    Expiration = DateTime.UtcNow.AddHours(3)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при входе пользователя {Username}", request.Username);
                return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
            }
        }
        
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] LoginRequest request)
        {
            try
            {
                // Проверяем, существует ли пользователь
                if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                {
                    return BadRequest(new { message = "Пользователь с таким именем уже существует" });
                }
                
                // Хешируем пароль
                var passwordHash = _passwordService.HashPassword(request.Password);
                
                var user = new User
                {
                    Username = request.Username,
                    PasswordHash = passwordHash,
                    Email = $"{request.Username}@company.com",
                    Role = "Subscriber",
                    FullName = request.Username,
                    CreatedAt = DateTime.UtcNow
                };
                
                await _context.Users.AddAsync(user);
                await _context.SaveChangesAsync();
                
                // Создаем карточку абонента
                var card = new SubscriberCard
                {
                    UserId = user.Id,
                    FullName = user.FullName ?? user.Username,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                await _context.SubscriberCards.AddAsync(card);
                await _context.SaveChangesAsync();
                
                return Ok(new { message = "Пользователь успешно создан" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при регистрации пользователя");
                return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
            }
        }
    }
    
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}