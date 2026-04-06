using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhoneDirectory.API.Data;
using PhoneDirectory.API.Models;

namespace PhoneDirectory.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ContactTypesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        
        public ContactTypesController(ApplicationDbContext context)
        {
            _context = context;
        }
        
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var types = await _context.ContactTypes
                .Where(ct => ct.IsActive)
                .OrderBy(ct => ct.Name)
                .Select(ct => new
                {
                    ct.Id,
                    ct.Name,
                    ct.Description,
                    ct.IsActive
                })
                .ToListAsync();
            return Ok(types);
        }
        
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] ContactType type)
        {
            _context.ContactTypes.Add(type);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), type);
        }
    }
}