namespace PhoneDirectory.API.DTOs
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
    }
    
    public class SimpleSubscriberCardDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Position { get; set; }
        public string? Department { get; set; }
        public string? Building { get; set; }
        public string? OfficeNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<SimpleContactInfoDto> ContactInfos { get; set; } = new();
    }
    
    public class SimpleContactInfoDto
    {
        public int Id { get; set; }
        public int ContactTypeId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
    }
}