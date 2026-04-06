namespace PhoneDirectory.API.DTOs
{
    public class UpdateProfileDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? Position { get; set; }
        public string? Department { get; set; }
        public string? Building { get; set; }
        public string? OfficeNumber { get; set; }
        public List<ContactInfoUpdateDto> ContactInfos { get; set; } = new();
    }

    public class ContactInfoUpdateDto
    {
        public int Id { get; set; }
        public int ContactTypeId { get; set; }
        public string Value { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
    }

    public class SubscriberDetailsDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Position { get; set; }
        public string? Department { get; set; }
        public string? Building { get; set; }
        public string? OfficeNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<ContactInfoDto> ContactInfos { get; set; } = new();
    }
}