namespace PhoneDirectory.API.DTOs
{
    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
    
    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTime Expiration { get; set; }
    }
    
    public class SubscriberCardDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Position { get; set; }
        public string? Department { get; set; }
        public string? Building { get; set; }
        public string? OfficeNumber { get; set; }
        public DateTime? HireDate { get; set; }
        public string? WorkExperience { get; set; }
        public List<ContactInfoDto> ContactInfos { get; set; } = new();
    }
    
    public class ContactInfoDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
    }
    
    public class SearchRequestDto
    {
        public string? SearchTerm { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
    
    public class PaginatedResponseDto<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }
}