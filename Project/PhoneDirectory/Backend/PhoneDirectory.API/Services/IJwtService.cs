using System.Security.Claims;
using PhoneDirectory.API.Models;

namespace PhoneDirectory.API.Services
{
    public interface IJwtService
    {
        string GenerateToken(User user);
        ClaimsPrincipal? ValidateToken(string token);
    }
}